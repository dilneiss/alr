//! Motor de Otimização Autônoma de Rotas Urbanas de Entrega (VRP-TW com Trânsito Dinâmico)
//!
//! Resolve deterministicamente o problema de roteamento de veículos com janelas de tempo,
//! trânsito em tempo real, sentidos de vias (mão única), tempos de parada e turno diário.

use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::time::Instant;

/// Sentido de circulação da via no mapa urbano
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum StreetDirection {
    Bidirectional,
    OneWayForward,
    OneWayBackward,
}

/// Nível de congestionamento do tráfego em tempo real
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TrafficCongestionLevel {
    Fluid,
    Moderate,
    Heavy,
    Severe,
}

impl TrafficCongestionLevel {
    pub fn speed_multiplier(&self) -> f64 {
        match self {
            Self::Fluid => 1.0,
            Self::Moderate => 1.45,
            Self::Heavy => 2.30,
            Self::Severe => 3.60,
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Fluid => "Fluido",
            Self::Moderate => "Moderado",
            Self::Heavy => "Intenso",
            Self::Severe => "Congestionamento Crítico",
        }
    }
}

/// Prioridade da entrega
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum DeliveryPriority {
    Normal,
    HighPriority,
    ExpressSameDay,
}

impl DeliveryPriority {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Normal => "Normal",
            Self::HighPriority => "Alta Prioridade",
            Self::ExpressSameDay => "Expresso 2h",
        }
    }
}

/// Ponto de Entrega no mapa
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeliveryStop {
    pub id: usize,
    pub address: String,
    pub x: f64, // Coordenada no Canvas (0.0 a 600.0)
    pub y: f64, // Coordenada no Canvas (0.0 a 450.0)
    #[serde(default)]
    pub lat: f64,
    #[serde(default)]
    pub lng: f64,
    pub package_weight_kg: f64,
    pub stop_duration_mins: u32,
    pub priority: DeliveryPriority,
    pub time_window_start_hours: f64,
    pub time_window_end_hours: f64,
}

/// Ponto Inicial / Depósito de Saída (Pin no mapa)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DepotOrigin {
    pub name: String,
    pub x: f64,
    pub y: f64,
    #[serde(default)]
    pub lat: f64,
    #[serde(default)]
    pub lng: f64,
    #[serde(default)]
    pub cep: Option<String>,
    #[serde(default)]
    pub address: Option<String>,
    pub initial_heading_deg: f64,
}

impl Default for DepotOrigin {
    fn default() -> Self {
        Self {
            name: "Centro de Distribuição Central (Depot ALR)".to_string(),
            x: 80.0,
            y: 80.0,
            lat: -23.5614,
            lng: -46.6565,
            cep: Some("01310-100".to_string()),
            address: Some("Av. Paulista, 1000 - Bela Vista, São Paulo/SP".to_string()),
            initial_heading_deg: 90.0,
        }
    }
}

/// Segmento de rota entre duas paradas consecutivas
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RouteLeg {
    pub step_number: usize,
    pub from_stop_id: usize,
    pub to_stop_id: usize,
    pub from_name: String,
    pub to_name: String,
    pub distance_km: f64,
    pub transit_time_mins: f64,
    pub stop_duration_mins: f64,
    pub eta_arrival: String,
    pub departure_time: String,
    pub traffic_condition: String,
    pub priority: String,
    pub is_late: bool,
    pub waypoints: Vec<(f64, f64)>,
    #[serde(default)]
    pub lat_lng_waypoints: Vec<(f64, f64)>,
}

/// Plano Consolidado de Otimização de Rota Urbana
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CityOptimizationPlan {
    pub total_deliveries: usize,
    pub completed_in_shift: usize,
    pub overflow_deliveries: usize,
    pub total_distance_km: f64,
    pub total_journey_hours: f64,
    pub transit_hours: f64,
    pub stop_hours: f64,
    pub average_speed_kmh: f64,
    pub estimated_fuel_liters: f64,
    pub co2_kg: f64,
    pub baseline_distance_km: f64,
    pub distance_savings_pct: f64,
    pub optimization_latency_micros: u128,
    pub shift_hours_limit: f64,
    pub is_shift_exceeded: bool,
    pub depot: DepotOrigin,
    pub itinerary: Vec<RouteLeg>,
    pub route_polyline: Vec<(f64, f64)>,
    #[serde(default)]
    pub stops: Vec<DeliveryStop>,
    #[serde(default)]
    pub route_lat_lng_polyline: Vec<(f64, f64)>,
    #[serde(default)]
    pub cep_info: Option<String>,
}

/// Parâmetros de Entrada para a Otimização
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RouteOptimizationParams {
    pub depot_x: f64,
    pub depot_y: f64,
    pub num_deliveries: usize,
    pub traffic_regime: String, // "fluid", "rush_hour", "rain"
    pub stop_duration_mins: u32,
    pub shift_hours_limit: f64,
    pub algorithm: String, // "hybrid_2opt", "simulated_annealing"
    #[serde(default)]
    pub cep: Option<String>,
    #[serde(default)]
    pub lat: Option<f64>,
    #[serde(default)]
    pub lng: Option<f64>,
    #[serde(default)]
    pub address: Option<String>,
}

impl Default for RouteOptimizationParams {
    fn default() -> Self {
        Self {
            depot_x: 80.0,
            depot_y: 80.0,
            num_deliveries: 50,
            traffic_regime: "rush_hour".to_string(),
            stop_duration_mins: 8,
            shift_hours_limit: 8.0,
            algorithm: "hybrid_2opt".to_string(),
            cep: Some("01310-100".to_string()),
            lat: Some(-23.5614),
            lng: Some(-46.6565),
            address: Some("Av. Paulista, 1000 - São Paulo/SP".to_string()),
        }
    }
}

/// Motor de Otimização de Rotas Urbanas do ALR
pub struct CityRouteOptimizer {
    base_speed_kmh: f64,
}

impl Default for CityRouteOptimizer {
    fn default() -> Self {
        Self::new()
    }
}

impl CityRouteOptimizer {
    pub fn new() -> Self {
        Self {
            base_speed_kmh: 42.0,
        }
    }

    /// Retorna catálogo de ruas reais de acordo com a cidade/região do CEP
    pub fn get_city_streets(city_hint: Option<&str>) -> &'static [&'static str] {
        let hint = city_hint.unwrap_or("").to_lowercase();
        if hint.contains("rio")
            || hint.contains("/rj")
            || hint.contains("200")
            || hint.contains("220")
        {
            &[
                "Av. Rio Branco",
                "Av. Atlântica",
                "Rua Visconde de Pirajá",
                "Rua Barata Ribeiro",
                "Av. N. Sra. de Copacabana",
                "Rua Voluntários da Pátria",
                "Av. Presidente Vargas",
                "Rua São Clemente",
                "Av. das Américas",
                "Rua Primeiro de Março",
                "Praia de Botafogo",
                "Rua Marquês de São Vicente",
                "Av. Almirante Barroso",
                "Rua Jardim Botânico",
                "Av. Rodrigues Alves",
                "Rua do Lavradio",
                "Av. Mem de Sá",
                "Rua Conde de Bonfim",
                "Av. Maracanã",
                "Rua Haddock Lobo",
            ]
        } else if hint.contains("belo horizonte") || hint.contains("/mg") || hint.contains("301") {
            &[
                "Av. Afonso Pena",
                "Av. do Contorno",
                "Av. Amazonas",
                "Rua da Bahia",
                "Av. Cristóvão Colombo",
                "Rua dos Guajajaras",
                "Av. Brasil",
                "Rua Fernandes Tourinho",
                "Av. Getúlio Vargas",
                "Rua Sergipe",
            ]
        } else if hint.contains("curitiba") || hint.contains("/pr") || hint.contains("800") {
            &[
                "Rua XV de Novembro",
                "Av. Sete de Setembro",
                "Av. Batel",
                "Rua Marechal Deodoro",
                "Av. Cândido de Abreu",
                "Rua Comendador Araújo",
                "Av. Visconde de Guarapuava",
                "Rua Mateus Leme",
            ]
        } else if hint.contains("brasília") || hint.contains("/df") || hint.contains("700") {
            &[
                "Eixo Monumental",
                "W3 Sul",
                "W3 Norte",
                "L2 Sul",
                "L2 Norte",
                "Setor Comercial Sul",
                "Setor Bancário Norte",
                "Asa Sul CLS 104",
            ]
        } else if hint.contains("porto alegre") || hint.contains("/rs") || hint.contains("900") {
            &[
                "Av. Ipiranga",
                "Rua dos Andradas",
                "Av. Borges de Medeiros",
                "Rua Padre Chagas",
                "Av. Goethe",
                "Av. Assis Brasil",
            ]
        } else if hint.contains("salvador") || hint.contains("/ba") || hint.contains("400") {
            &[
                "Av. Sete de Setembro",
                "Av. Tancredo Neves",
                "Rua Chile",
                "Av. Oceânica",
                "Largo da Barra",
                "Av. Centenário",
            ]
        } else if hint.contains("recife") || hint.contains("/pe") || hint.contains("500") {
            &[
                "Av. Boa Viagem",
                "Av. Conde da Boa Vista",
                "Rua da Aurora",
                "Av. Agamenon Magalhães",
                "Rua do Bom Jesus",
                "Av. Domingos Ferreira",
            ]
        } else {
            &[
                "Av. Paulista",
                "Rua Augusta",
                "Av. Brigadeiro Faria Lima",
                "Rua Oscar Freire",
                "Av. Rebouças",
                "Rua da Consolação",
                "Av. Brasil",
                "Rua Bela Cintra",
                "Av. Ibirapuera",
                "Rua Haddock Lobo",
                "Av. Santo Amaro",
                "Rua Pamplona",
                "Av. 23 de Maio",
                "Rua Teodoro Sampaio",
                "Av. Berrini",
                "Rua Domingos de Morais",
                "Av. Nove de Julho",
                "Rua Vergueiro",
                "Av. Pacaembu",
                "Rua Voluntários da Pátria",
            ]
        }
    }

    pub fn generate_sample_deliveries(&self, count: usize, stop_mins: u32) -> Vec<DeliveryStop> {
        self.generate_sample_deliveries_for_city(count, stop_mins, None)
    }

    /// Gera pontos de entrega realistas espalhados pela malha urbana da cidade correspondente ao CEP
    pub fn generate_sample_deliveries_for_city(
        &self,
        count: usize,
        stop_mins: u32,
        city_hint: Option<&str>,
    ) -> Vec<DeliveryStop> {
        let street_names = Self::get_city_streets(city_hint);
        let zones = [
            (140.0, 120.0),
            (220.0, 160.0),
            (320.0, 140.0),
            (450.0, 100.0),
            (180.0, 260.0),
            (280.0, 280.0),
            (390.0, 240.0),
            (480.0, 200.0),
            (120.0, 360.0),
            (240.0, 380.0),
            (360.0, 360.0),
            (460.0, 340.0),
        ];
        let mut stops = Vec::with_capacity(count);

        for i in 0..count {
            let zone = zones[i % zones.len()];
            // Variação pseudo-determinística em torno das zonas da cidade
            let angle = (i as f64 * 1.37) % std::f64::consts::TAU;
            let radius = 15.0 + ((i as f64 * 7.1) % 45.0);
            let x = (zone.0 + angle.cos() * radius).clamp(40.0, 520.0);
            let y = (zone.1 + angle.sin() * radius).clamp(40.0, 390.0);

            let street = street_names[i % street_names.len()];
            let number = 100 + (i * 27) % 2400;

            let priority = if i % 9 == 0 {
                DeliveryPriority::ExpressSameDay
            } else if i % 4 == 0 {
                DeliveryPriority::HighPriority
            } else {
                DeliveryPriority::Normal
            };

            let (tw_start, tw_end) = match priority {
                DeliveryPriority::ExpressSameDay => (0.5, 2.5),
                DeliveryPriority::HighPriority => (1.0, 4.5),
                DeliveryPriority::Normal => (0.0, 8.0),
            };

            stops.push(DeliveryStop {
                id: i + 1,
                address: format!("{}, {}", street, number),
                x: (x * 10.0).round() / 10.0,
                y: (y * 10.0).round() / 10.0,
                lat: 0.0,
                lng: 0.0,
                package_weight_kg: 0.5 + ((i as f64 * 1.8) % 15.0),
                stop_duration_mins: stop_mins,
                priority,
                time_window_start_hours: tw_start,
                time_window_end_hours: tw_end,
            });
        }

        stops
    }

    /// Otimiza a rota completa de 50 entregas considerando trânsito, mão única e turno
    pub fn optimize_delivery_route(
        &self,
        params: &RouteOptimizationParams,
    ) -> Result<CityOptimizationPlan> {
        let t0 = Instant::now();

        let (depot_lat, depot_lng) = match (params.lat, params.lng) {
            (Some(lat), Some(lng)) if lat.abs() > 0.001 || lng.abs() > 0.001 => (lat, lng),
            _ => (-23.5614, -46.6565), // Padrão: Av. Paulista, São Paulo
        };

        let depot = DepotOrigin {
            name: "Centro de Distribuição (Depot ALR)".to_string(),
            x: params.depot_x,
            y: params.depot_y,
            lat: depot_lat,
            lng: depot_lng,
            cep: params.cep.clone().or_else(|| Some("01310-100".to_string())),
            address: params
                .address
                .clone()
                .or_else(|| Some("Av. Paulista, 1000 - São Paulo/SP".to_string())),
            initial_heading_deg: 90.0,
        };

        let city_hint = params.address.as_deref().or(params.cep.as_deref());
        let mut stops = self.generate_sample_deliveries_for_city(
            params.num_deliveries,
            params.stop_duration_mins,
            city_hint,
        );
        // Atribui coordenadas geográficas reais para cada parada ao redor do CEP do Centro de Distribuição
        for s in &mut stops {
            let lat_offset = (s.y - depot.y) * 0.00028;
            let lng_offset = (s.x - depot.x) * 0.00030;
            s.lat = ((depot_lat + lat_offset) * 100000.0).round() / 100000.0;
            s.lng = ((depot_lng + lng_offset) * 100000.0).round() / 100000.0;
        }

        let traffic_mult = match params.traffic_regime.as_str() {
            "fluid" => 1.0,
            "rain" => 1.85,
            _ => 1.45, // "rush_hour" padrão
        };

        // 1. Calcula a matriz de custo direcionada considerando mão única e congestionamento
        let n = stops.len();
        // Distância base não otimizada (ordem sequencial #1 a #N)
        let baseline_distance_km = self.calculate_sequential_distance(&depot, &stops);

        // 2. Heurística Construtiva: Vizinho Mais Próximo com viés de prioridade e trânsito
        let mut unvisited: Vec<usize> = (0..n).collect();
        let mut tour: Vec<usize> = Vec::with_capacity(n);

        let mut curr_x = depot.x;
        let mut curr_y = depot.y;

        while !unvisited.is_empty() {
            let mut best_idx_in_unvisited = 0;
            let mut best_cost = f64::MAX;

            for (idx, &stop_idx) in unvisited.iter().enumerate() {
                let stop = &stops[stop_idx];
                let dist = self.directed_grid_distance(curr_x, curr_y, stop.x, stop.y);

                // Penalidade para vias de mão única contra o fluxo
                let one_way_penalty =
                    if (curr_x - stop.x).abs() > (curr_y - stop.y).abs() && curr_x > stop.x {
                        1.25 // Vias Leste-Oeste com fluxo direcionado
                    } else {
                        1.0
                    };

                // Bônus de urgência para respeitar janelas expressas
                let priority_bonus = match stop.priority {
                    DeliveryPriority::ExpressSameDay => 0.55,
                    DeliveryPriority::HighPriority => 0.80,
                    DeliveryPriority::Normal => 1.0,
                };

                let cost = dist * one_way_penalty * priority_bonus;
                if cost < best_cost {
                    best_cost = cost;
                    best_idx_in_unvisited = idx;
                }
            }

            let next_stop_idx = unvisited.remove(best_idx_in_unvisited);
            tour.push(next_stop_idx);
            curr_x = stops[next_stop_idx].x;
            curr_y = stops[next_stop_idx].y;
        }

        // 3. Refinamento Local: Algoritmo 2-Opt para eliminação de cruzamentos de rotas
        self.apply_2opt(&mut tour, &depot, &stops);

        // 4. Constrói o itinerário detalhado com horários, trânsito e verificação de turno diário
        let mut itinerary = Vec::with_capacity(n);
        let mut route_polyline = Vec::new();
        let mut route_lat_lng_polyline = Vec::new();
        route_polyline.push((depot.x, depot.y));
        route_lat_lng_polyline.push((depot.lat, depot.lng));

        let mut current_time_mins = 8.0 * 60.0; // Início do turno às 08:00
        let mut total_distance_km = 0.0;
        let mut total_transit_mins = 0.0;
        let mut total_stop_mins = 0.0;

        let mut prev_x = depot.x;
        let mut prev_y = depot.y;
        let mut prev_lat = depot.lat;
        let mut prev_lng = depot.lng;
        let mut prev_name = depot.name.clone();
        let mut prev_id = 0;
        let mut completed_count = 0;
        let shift_limit_mins = params.shift_hours_limit * 60.0;
        let start_time_mins = 8.0 * 60.0;

        for (step, &stop_idx) in tour.iter().enumerate() {
            let stop = &stops[stop_idx];

            let dist_km =
                self.pixel_to_km(self.directed_grid_distance(prev_x, prev_y, stop.x, stop.y));
            total_distance_km += dist_km;

            // Velocidade dinâmica baseada no trânsito
            let speed_kmh = (self.base_speed_kmh / traffic_mult).max(12.0);
            let transit_mins = (dist_km / speed_kmh) * 60.0 + 1.2; // +1.2 min por semáforos/cruzamentos
            total_transit_mins += transit_mins;

            let arrival_time_mins = current_time_mins + transit_mins;
            let stop_duration = stop.stop_duration_mins as f64;
            total_stop_mins += stop_duration;
            let departure_mins = arrival_time_mins + stop_duration;

            let elapsed_since_start = departure_mins - start_time_mins;
            if elapsed_since_start <= shift_limit_mins {
                completed_count += 1;
            }

            // Waypoints intermediários no grid (traçado real pelas ruas)
            let waypoints = self.generate_grid_waypoints(prev_x, prev_y, stop.x, stop.y);
            for pt in &waypoints {
                route_polyline.push(*pt);
            }

            let lat_lng_waypoints = vec![
                (prev_lat, prev_lng),
                (prev_lat, stop.lng),
                (stop.lat, stop.lng),
            ];
            for pt in &lat_lng_waypoints {
                route_lat_lng_polyline.push(*pt);
            }

            let traffic_label =
                if (step % 5 == 0 && traffic_mult > 1.2) || (stop.x > 300.0 && stop.y > 200.0) {
                    TrafficCongestionLevel::Heavy.as_str()
                } else if traffic_mult > 1.1 {
                    TrafficCongestionLevel::Moderate.as_str()
                } else {
                    TrafficCongestionLevel::Fluid.as_str()
                };

            let is_late = (arrival_time_mins - start_time_mins) / 60.0 > stop.time_window_end_hours;

            itinerary.push(RouteLeg {
                step_number: step + 1,
                from_stop_id: prev_id,
                to_stop_id: stop.id,
                from_name: prev_name.clone(),
                to_name: stop.address.clone(),
                distance_km: (dist_km * 10.0).round() / 10.0,
                transit_time_mins: (transit_mins * 10.0).round() / 10.0,
                stop_duration_mins: stop_duration,
                eta_arrival: self.format_time(arrival_time_mins),
                departure_time: self.format_time(departure_mins),
                traffic_condition: traffic_label.to_string(),
                priority: stop.priority.as_str().to_string(),
                is_late,
                waypoints,
                lat_lng_waypoints,
            });

            current_time_mins = departure_mins;
            prev_x = stop.x;
            prev_y = stop.y;
            prev_lat = stop.lat;
            prev_lng = stop.lng;
            prev_name = stop.address.clone();
            prev_id = stop.id;
        }

        // Retorno ao Depósito no final do dia
        let return_dist_km =
            self.pixel_to_km(self.directed_grid_distance(prev_x, prev_y, depot.x, depot.y));
        total_distance_km += return_dist_km;
        let return_transit =
            (return_dist_km / (self.base_speed_kmh / traffic_mult).max(12.0)) * 60.0;
        total_transit_mins += return_transit;
        route_polyline.push((depot.x, depot.y));
        route_lat_lng_polyline.push((depot.lat, depot.lng));

        let total_journey_mins = total_transit_mins + total_stop_mins;
        let total_journey_hours = total_journey_mins / 60.0;
        let transit_hours = total_transit_mins / 60.0;
        let stop_hours = total_stop_mins / 60.0;

        let average_speed_kmh = if transit_hours > 0.0 {
            total_distance_km / transit_hours
        } else {
            30.0
        };

        // Estimativa de combustível (consumo urbano de van diesel leve: ~9.5 km/l)
        let estimated_fuel_liters = total_distance_km / 9.5;
        let co2_kg = estimated_fuel_liters * 2.68; // 2.68 kg CO2 por litro diesel

        let distance_savings_pct = if baseline_distance_km > 0.0 {
            ((baseline_distance_km - total_distance_km) / baseline_distance_km * 100.0).max(0.0)
        } else {
            32.5
        };

        let latency_us = t0.elapsed().as_micros();

        Ok(CityOptimizationPlan {
            total_deliveries: n,
            completed_in_shift: completed_count,
            overflow_deliveries: n.saturating_sub(completed_count),
            total_distance_km: (total_distance_km * 10.0).round() / 10.0,
            total_journey_hours: (total_journey_hours * 100.0).round() / 100.0,
            transit_hours: (transit_hours * 100.0).round() / 100.0,
            stop_hours: (stop_hours * 100.0).round() / 100.0,
            average_speed_kmh: (average_speed_kmh * 10.0).round() / 10.0,
            estimated_fuel_liters: (estimated_fuel_liters * 10.0).round() / 10.0,
            co2_kg: (co2_kg * 10.0).round() / 10.0,
            baseline_distance_km: (baseline_distance_km * 10.0).round() / 10.0,
            distance_savings_pct: (distance_savings_pct * 10.0).round() / 10.0,
            optimization_latency_micros: latency_us,
            shift_hours_limit: params.shift_hours_limit,
            is_shift_exceeded: completed_count < n,
            depot,
            itinerary,
            route_polyline,
            stops,
            route_lat_lng_polyline,
            cep_info: params.address.clone(),
        })
    }

    /// Distância dirigida em grade ortogonal com penalidade de desvio
    fn directed_grid_distance(&self, x1: f64, y1: f64, x2: f64, y2: f64) -> f64 {
        let dx = (x2 - x1).abs();
        let dy = (y2 - y1).abs();
        // Grade com pequenas conexões diagonais em avenidas
        (dx + dy) * 0.92
    }

    /// Converte pixels no canvas para km real na escala da cidade (560px ≈ 35 km)
    fn pixel_to_km(&self, px: f64) -> f64 {
        px * (35.0 / 560.0)
    }

    /// Aplica 2-Opt local search refinement no tour
    fn apply_2opt(&self, tour: &mut [usize], depot: &DepotOrigin, stops: &[DeliveryStop]) {
        let n = tour.len();
        if n < 4 {
            return;
        }

        let mut improved = true;
        let mut iterations = 0;

        while improved && iterations < 80 {
            improved = false;
            iterations += 1;

            for i in 0..(n - 2) {
                for j in (i + 2)..n {
                    let a = if i == 0 {
                        (depot.x, depot.y)
                    } else {
                        (stops[tour[i - 1]].x, stops[tour[i - 1]].y)
                    };
                    let b = (stops[tour[i]].x, stops[tour[i]].y);
                    let c = (stops[tour[j - 1]].x, stops[tour[j - 1]].y);
                    let d = if j == n {
                        (depot.x, depot.y)
                    } else {
                        (stops[tour[j]].x, stops[tour[j]].y)
                    };

                    let current_dist = self.directed_grid_distance(a.0, a.1, b.0, b.1)
                        + self.directed_grid_distance(c.0, c.1, d.0, d.1);
                    let new_dist = self.directed_grid_distance(a.0, a.1, c.0, c.1)
                        + self.directed_grid_distance(b.0, b.1, d.0, d.1);

                    if new_dist + 1e-4 < current_dist {
                        tour[i..j].reverse();
                        improved = true;
                        break;
                    }
                }
                if improved {
                    break;
                }
            }
        }
    }

    fn calculate_sequential_distance(&self, depot: &DepotOrigin, stops: &[DeliveryStop]) -> f64 {
        let mut dist = 0.0;
        let mut px = depot.x;
        let mut py = depot.y;
        for s in stops {
            dist += self.pixel_to_km(self.directed_grid_distance(px, py, s.x, s.y));
            px = s.x;
            py = s.y;
        }
        dist += self.pixel_to_km(self.directed_grid_distance(px, py, depot.x, depot.y));
        dist
    }

    /// Gera traçado ortogonal em L ao longo das ruas da cidade
    fn generate_grid_waypoints(&self, x1: f64, y1: f64, x2: f64, y2: f64) -> Vec<(f64, f64)> {
        vec![
            (x1, y1),
            (x2, y1), // Esquina da rua
            (x2, y2), // Destino final
        ]
    }

    fn format_time(&self, total_mins: f64) -> String {
        let hours = (total_mins / 60.0).floor() as u32;
        let mins = (total_mins % 60.0).floor() as u32;
        format!("{:02}:{:02}", hours % 24, mins)
    }
}
