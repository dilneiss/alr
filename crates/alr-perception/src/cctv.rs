use crate::image::RawImage;
pub use alr_execution::ThreatLevel;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;

/// Categorias de entidades detectadas no fluxo de vídeo de vigilância
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum DetectedEntityKind {
    Pessoa,
    Veiculo,
    Animal,
    PacoteSuspeito,
    MovimentoGenerico,
}

impl DetectedEntityKind {
    pub fn as_str(&self) -> &'static str {
        match self {
            DetectedEntityKind::Pessoa => "Pessoa",
            DetectedEntityKind::Veiculo => "Veículo",
            DetectedEntityKind::Animal => "Animal",
            DetectedEntityKind::PacoteSuspeito => "Pacote Suspeito",
            DetectedEntityKind::MovimentoGenerico => "Movimento Genérico",
        }
    }
}

/// Bounding Box representativa no plano 2D da imagem (coordenadas de pixel)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
pub struct BoundingBox {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}

impl BoundingBox {
    pub const fn new(x: u32, y: u32, width: u32, height: u32) -> Self {
        Self {
            x,
            y,
            width,
            height,
        }
    }

    pub fn area(&self) -> u32 {
        self.width * self.height
    }

    pub fn aspect_ratio(&self) -> f32 {
        if self.width == 0 {
            0.0
        } else {
            self.height as f32 / self.width as f32
        }
    }

    pub fn inv_aspect_ratio(&self) -> f32 {
        if self.height == 0 {
            0.0
        } else {
            self.width as f32 / self.height as f32
        }
    }

    pub fn intersects(&self, other: &BoundingBox) -> bool {
        let x_overlap = self.x < other.x + other.width && self.x + self.width > other.x;
        let y_overlap = self.y < other.y + other.height && self.y + self.height > other.y;
        x_overlap && y_overlap
    }

    pub fn contains_point(&self, px: u32, py: u32) -> bool {
        px >= self.x && px < self.x + self.width && py >= self.y && py < self.y + self.height
    }

    pub fn center(&self) -> (u32, u32) {
        (self.x + self.width / 2, self.y + self.height / 2)
    }
}

/// Zona de Perímetro ou Barreira Virtual (Tripwire / ROI)
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PerimeterZone {
    pub name: String,
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
    pub is_restricted: bool,
}

impl PerimeterZone {
    pub fn new(
        name: impl Into<String>,
        x: u32,
        y: u32,
        width: u32,
        height: u32,
        is_restricted: bool,
    ) -> Self {
        Self {
            name: name.into(),
            x,
            y,
            width,
            height,
            is_restricted,
        }
    }

    pub fn bbox(&self) -> BoundingBox {
        BoundingBox::new(self.x, self.y, self.width, self.height)
    }

    pub fn is_breached_by(&self, bbox: &BoundingBox) -> bool {
        self.is_restricted && self.bbox().intersects(bbox)
    }
}

/// Evento de vigilância analítico gerado pelo motor de visão computacional
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SurveillanceEvent {
    pub timestamp: DateTime<Utc>,
    pub entity_kind: DetectedEntityKind,
    pub threat_level: ThreatLevel,
    pub bbox: BoundingBox,
    pub confidence: f32,
    pub motion_intensity: f32,
    pub tripwire_breached: bool,
    pub summary: String,
}

#[derive(Debug, Clone, Copy, Default)]
struct CellMotionInfo {
    count: u16,
    min_x: u16,
    max_x: u16,
    min_y: u16,
    max_y: u16,
}

/// Motor de vigilância e monitoramento contínuo em tempo real (CCTV) em CPU local
pub struct CctvSurveillanceEngine {
    previous_frame: Option<RawImage>,
    zones: Vec<PerimeterZone>,
    motion_threshold: u8,
    min_blob_area: u32,
    cell_size: usize,
    frame_counter: u64,
    // Buffers reutilizados para zero alocações por frame
    cell_info: Vec<CellMotionInfo>,
    visited_cells: Vec<bool>,
}

impl CctvSurveillanceEngine {
    pub fn new() -> Self {
        Self {
            previous_frame: None,
            zones: Vec::new(),
            motion_threshold: 20,
            min_blob_area: 16,
            cell_size: 4,
            frame_counter: 0,
            cell_info: Vec::new(),
            visited_cells: Vec::new(),
        }
    }

    pub fn with_zones(mut self, zones: Vec<PerimeterZone>) -> Self {
        self.zones = zones;
        self
    }

    pub fn add_zone(&mut self, zone: PerimeterZone) {
        self.zones.push(zone);
    }

    pub fn set_motion_threshold(&mut self, threshold: u8) {
        self.motion_threshold = threshold;
    }

    pub fn set_min_blob_area(&mut self, min_area: u32) {
        self.min_blob_area = min_area;
    }

    pub fn zones(&self) -> &[PerimeterZone] {
        &self.zones
    }

    pub fn reset_background(&mut self) {
        self.previous_frame = None;
    }

    /// Processa um quadro de vídeo (`RawImage`) em CPU local com latência < 1 ms
    pub fn process_frame(&mut self, current_frame: &RawImage) -> Vec<SurveillanceEvent> {
        self.frame_counter += 1;
        let w = current_frame.width as usize;
        let h = current_frame.height as usize;

        if w == 0 || h == 0 {
            return Vec::new();
        }

        // Se for o primeiro quadro ou dimensões mudaram, armazena como referência inicial
        let prev = match &self.previous_frame {
            Some(p) if p.width == current_frame.width && p.height == current_frame.height => p,
            _ => {
                self.previous_frame = Some(current_frame.clone());
                return Vec::new();
            }
        };

        let cell_sz = self.cell_size;
        let grid_w = w.div_ceil(cell_sz);
        let grid_h = h.div_ceil(cell_sz);
        let grid_len = grid_w * grid_h;

        if self.cell_info.len() != grid_len {
            self.cell_info.resize(grid_len, CellMotionInfo::default());
        } else {
            self.cell_info.fill(CellMotionInfo::default());
        }

        if self.visited_cells.len() != grid_len {
            self.visited_cells.resize(grid_len, false);
        } else {
            self.visited_cells.fill(false);
        }

        let thresh_sum = (self.motion_threshold as i16) * 3;

        // 1. Diferenciação temporal de quadros ultra-rápida via iteradores sem overhead de bounds-check
        let mut total_motion_pixels = 0usize;
        let mut x = 0usize;
        let mut y = 0usize;
        let mut gy_offset = 0usize;
        let (curr_chunks, _) = current_frame.data.as_chunks::<4>();
        let (prev_chunks, _) = prev.data.as_chunks::<4>();

        for (curr_px, prev_px) in curr_chunks.iter().zip(prev_chunks.iter()) {
            let dr = (curr_px[0] as i16 - prev_px[0] as i16).abs();
            let dg = (curr_px[1] as i16 - prev_px[1] as i16).abs();
            let db = (curr_px[2] as i16 - prev_px[2] as i16).abs();

            if dr + dg + db >= thresh_sum {
                let gx = x >> 2;
                let cell_idx = gy_offset + gx;
                if cell_idx < self.cell_info.len() {
                    let cell = &mut self.cell_info[cell_idx];
                    if cell.count == 0 {
                        cell.min_x = x as u16;
                        cell.max_x = x as u16;
                        cell.min_y = y as u16;
                        cell.max_y = y as u16;
                    } else {
                        cell.min_x = cell.min_x.min(x as u16);
                        cell.max_x = cell.max_x.max(x as u16);
                        cell.min_y = cell.min_y.min(y as u16);
                        cell.max_y = cell.max_y.max(y as u16);
                    }
                    cell.count += 1;
                    total_motion_pixels += 1;
                }
            }

            x += 1;
            if x == w {
                x = 0;
                y += 1;
                let gy = y >> 2;
                gy_offset = gy * grid_w;
            }
        }

        // Se não houve nenhum pixel em movimento, atualiza buffer e retorna lista vazia
        if total_motion_pixels == 0 {
            if let Some(prev_frame) = &mut self.previous_frame {
                prev_frame.data.copy_from_slice(&current_frame.data);
            }
            return Vec::new();
        }

        // 2. Agrupamento por componentes conectados (8-conectividade na grade de blocos)
        let mut clusters: Vec<(u32, u32, u32, u32, u32)> = Vec::new(); // (min_x, min_y, max_x, max_y, motion_pixels)
        let mut queue = VecDeque::new();

        for gy in 0..grid_h {
            for gx in 0..grid_w {
                let cell_idx = gy * grid_w + gx;
                if self.cell_info[cell_idx].count == 0 || self.visited_cells[cell_idx] {
                    continue;
                }

                self.visited_cells[cell_idx] = true;
                queue.push_back((gx, gy));

                let mut comp_min_x = usize::MAX;
                let mut comp_max_x = 0usize;
                let mut comp_min_y = usize::MAX;
                let mut comp_max_y = 0usize;
                let mut comp_motion_count = 0u32;

                while let Some((cx, cy)) = queue.pop_front() {
                    let c_idx = cy * grid_w + cx;
                    let c_info = self.cell_info[c_idx];

                    comp_motion_count += c_info.count as u32;
                    comp_min_x = comp_min_x.min(c_info.min_x as usize);
                    comp_max_x = comp_max_x.max(c_info.max_x as usize);
                    comp_min_y = comp_min_y.min(c_info.min_y as usize);
                    comp_max_y = comp_max_y.max(c_info.max_y as usize);

                    // Expansão 8-conectada
                    for dy in -1i32..=1 {
                        for dx in -1i32..=1 {
                            if dx == 0 && dy == 0 {
                                continue;
                            }
                            let nx = cx as i32 + dx;
                            let ny = cy as i32 + dy;
                            if nx >= 0 && nx < grid_w as i32 && ny >= 0 && ny < grid_h as i32 {
                                let n_idx = (ny as usize) * grid_w + (nx as usize);
                                if self.cell_info[n_idx].count > 0 && !self.visited_cells[n_idx] {
                                    self.visited_cells[n_idx] = true;
                                    queue.push_back((nx as usize, ny as usize));
                                }
                            }
                        }
                    }
                }

                if comp_motion_count >= self.min_blob_area && comp_min_x <= comp_max_x {
                    clusters.push((
                        comp_min_x as u32,
                        comp_min_y as u32,
                        comp_max_x as u32,
                        comp_max_y as u32,
                        comp_motion_count,
                    ));
                }
            }
        }

        // 3. Classificação morfológica, verificação de perímetro e geração de eventos
        let now = Utc::now();
        let mut events = Vec::new();

        for (min_x, min_y, max_x, max_y, motion_pixels) in clusters {
            let width = max_x - min_x + 1;
            let height = max_y - min_y + 1;
            let bbox = BoundingBox::new(min_x, min_y, width, height);
            let area = bbox.area();
            let aspect_ratio = bbox.aspect_ratio();
            let inv_aspect = bbox.inv_aspect_ratio();
            let motion_intensity = (motion_pixels as f32 / area.max(1) as f32).clamp(0.0, 1.0);

            let (entity_kind, confidence) = if (1.4..=4.2).contains(&aspect_ratio) && height >= 20 {
                // Morfologia esbelta vertical típica de humano em pé/caminhando/correndo
                let ratio_score = (1.0 - (aspect_ratio - 2.4).abs() / 2.0).clamp(0.0, 1.0);
                (DetectedEntityKind::Pessoa, 0.85 + 0.12 * ratio_score)
            } else if (inv_aspect >= 1.3 || aspect_ratio <= 0.77) && width >= 30 && area >= 200 {
                // Morfologia larga horizontal típica de automóveis/veículos
                let ratio_score = (1.0 - (inv_aspect - 2.0).abs() / 2.0).clamp(0.0, 1.0);
                (DetectedEntityKind::Veiculo, 0.88 + 0.10 * ratio_score)
            } else if area < 400 && (0.7..=1.3).contains(&aspect_ratio) && height <= 25 {
                // Objeto compacto, estático ou deixado próximo ao solo
                (DetectedEntityKind::PacoteSuspeito, 0.82)
            } else if area < 600 && (0.5..=1.4).contains(&aspect_ratio) && area >= 20 {
                // Animal/pet pequeno ou quadrúpede
                (DetectedEntityKind::Animal, 0.78)
            } else {
                // Movimentações gerais, folhagens, sombras ou ruído agrupado
                (DetectedEntityKind::MovimentoGenerico, 0.65)
            };

            // 4. Verificação de invasão de zona de perímetro restrito (Tripwire)
            let mut tripwire_breached = false;
            let mut breached_zone: Option<&PerimeterZone> = None;

            for zone in &self.zones {
                if zone.is_breached_by(&bbox) {
                    tripwire_breached = true;
                    breached_zone = Some(zone);
                    break;
                }
            }

            // 5. Cálculo do nível de ameaça (ThreatLevel)
            let threat_level = if tripwire_breached {
                match entity_kind {
                    DetectedEntityKind::Pessoa => ThreatLevel::InvasaoCritica,
                    DetectedEntityKind::Veiculo => ThreatLevel::InvasaoCritica,
                    DetectedEntityKind::PacoteSuspeito => ThreatLevel::Alto,
                    DetectedEntityKind::Animal => ThreatLevel::Medio,
                    DetectedEntityKind::MovimentoGenerico => ThreatLevel::Alto,
                }
            } else {
                match entity_kind {
                    DetectedEntityKind::Pessoa => ThreatLevel::Medio,
                    DetectedEntityKind::Veiculo => ThreatLevel::Baixo,
                    DetectedEntityKind::Animal => ThreatLevel::Seguro,
                    DetectedEntityKind::PacoteSuspeito => ThreatLevel::Medio,
                    DetectedEntityKind::MovimentoGenerico => ThreatLevel::Seguro,
                }
            };

            let breach_summary = if let Some(zone) = breached_zone {
                format!(
                    "ALERTA CRÍTICO: Invasão da zona restrita '{}' detectada!",
                    zone.name
                )
            } else {
                "Perímetro seguro (fora de área restrita).".to_string()
            };

            let summary = format!(
                "[{}] {} identificado em [x={}, y={}, w={}, h={}] (confiança: {:.1}%, movimento: {:.0}%). {}",
                threat_level.as_str(),
                entity_kind.as_str(),
                bbox.x,
                bbox.y,
                bbox.width,
                bbox.height,
                confidence * 100.0,
                motion_intensity * 100.0,
                breach_summary
            );

            events.push(SurveillanceEvent {
                timestamp: now,
                entity_kind,
                threat_level,
                bbox,
                confidence,
                motion_intensity,
                tripwire_breached,
                summary,
            });
        }

        // Atualiza quadro anterior via cópia de memória sem alocação
        if let Some(prev_frame) = &mut self.previous_frame {
            prev_frame.data.copy_from_slice(&current_frame.data);
        }

        events
    }

    /// Renderiza visualização ASCII em alta fidelidade da câmera de segurança
    #[allow(clippy::needless_range_loop)]
    pub fn render_ascii_feed(
        &self,
        frame: &RawImage,
        events: &[SurveillanceEvent],
        out_w: usize,
        out_h: usize,
    ) -> String {
        let mut grid = vec![vec![' '; out_w]; out_h];

        // 1. Renderiza zonas de perímetro
        for zone in &self.zones {
            let x0 = (zone.x as usize * out_w) / frame.width as usize;
            let x1 = ((zone.x + zone.width) as usize * out_w) / frame.width as usize;
            let y0 = (zone.y as usize * out_h) / frame.height as usize;
            let y1 = ((zone.y + zone.height) as usize * out_h) / frame.height as usize;

            let border_char = if zone.is_restricted { '!' } else { '.' };
            for x in x0.min(out_w)..x1.min(out_w) {
                if y0 < out_h {
                    grid[y0][x] = border_char;
                }
                if y1 > 0 && y1 - 1 < out_h {
                    grid[y1 - 1][x] = border_char;
                }
            }
            for row in grid.iter_mut().take(y1.min(out_h)).skip(y0.min(out_h)) {
                if x0 < out_w {
                    row[x0] = border_char;
                }
                if x1 > 0 && x1 - 1 < out_w {
                    row[x1 - 1] = border_char;
                }
            }
        }

        // 2. Renderiza entidades detectadas
        for (idx, ev) in events.iter().enumerate() {
            let x0 = (ev.bbox.x as usize * out_w) / frame.width as usize;
            let x1 = ((ev.bbox.x + ev.bbox.width) as usize * out_w) / frame.width as usize;
            let y0 = (ev.bbox.y as usize * out_h) / frame.height as usize;
            let y1 = ((ev.bbox.y + ev.bbox.height) as usize * out_h) / frame.height as usize;

            let char_repr = match ev.entity_kind {
                DetectedEntityKind::Pessoa => 'P',
                DetectedEntityKind::Veiculo => 'V',
                DetectedEntityKind::Animal => 'A',
                DetectedEntityKind::PacoteSuspeito => 'X',
                DetectedEntityKind::MovimentoGenerico => '?',
            };

            for row in grid.iter_mut().take(y1.min(out_h)).skip(y0.min(out_h)) {
                for cell in row.iter_mut().take(x1.min(out_w)).skip(x0.min(out_w)) {
                    *cell = char_repr;
                }
            }

            // Tag do alvo
            if y0 < out_h && x0 < out_w {
                let tag = format!("{}:{}", char_repr, idx + 1);
                for (ti, ch) in tag.chars().enumerate() {
                    if x0 + ti < out_w {
                        grid[y0][x0 + ti] = ch;
                    }
                }
            }
        }

        // Constrói saída formatada com bordas de tela
        let mut out = String::with_capacity((out_w + 3) * (out_h + 2));
        out.push('+');
        for _ in 0..out_w {
            out.push('-');
        }
        out.push_str("+\n");

        for row in grid {
            out.push('|');
            for ch in row {
                out.push(ch);
            }
            out.push_str("|\n");
        }

        out.push('+');
        for _ in 0..out_w {
            out.push('-');
        }
        out.push_str("+\n");

        out
    }
}

impl Default for CctvSurveillanceEngine {
    fn default() -> Self {
        Self::new()
    }
}
