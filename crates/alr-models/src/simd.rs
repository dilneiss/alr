/// Vectorized Tensor Math & Feature Processing
/// Uses 8-wide unrolled chunks with compile-time array sizing that compile directly into AVX2 / AVX-512 and ARM NEON.
pub struct SimdFeatureVectorizer;

impl SimdFeatureVectorizer {
    /// Normalizes a feature vector in-place to L2 unit norm using 8-wide unrolled SIMD accumulation
    pub fn normalize_l2(features: &mut [f32]) {
        if features.is_empty() {
            return;
        }

        let (chunks, remainder) = features.as_chunks::<8>();
        let mut sum0 = 0.0f32;
        let mut sum1 = 0.0f32;
        let mut sum2 = 0.0f32;
        let mut sum3 = 0.0f32;
        let mut sum4 = 0.0f32;
        let mut sum5 = 0.0f32;
        let mut sum6 = 0.0f32;
        let mut sum7 = 0.0f32;

        for chunk in chunks {
            sum0 += chunk[0] * chunk[0];
            sum1 += chunk[1] * chunk[1];
            sum2 += chunk[2] * chunk[2];
            sum3 += chunk[3] * chunk[3];
            sum4 += chunk[4] * chunk[4];
            sum5 += chunk[5] * chunk[5];
            sum6 += chunk[6] * chunk[6];
            sum7 += chunk[7] * chunk[7];
        }

        let mut total_sq = sum0 + sum1 + sum2 + sum3 + sum4 + sum5 + sum6 + sum7;
        for &val in remainder {
            total_sq += val * val;
        }

        let norm = total_sq.sqrt();
        if norm > 1e-8 {
            let inv_norm = 1.0 / norm;
            let (chunks_mut, remainder_mut) = features.as_chunks_mut::<8>();
            for chunk in chunks_mut {
                chunk[0] *= inv_norm;
                chunk[1] *= inv_norm;
                chunk[2] *= inv_norm;
                chunk[3] *= inv_norm;
                chunk[4] *= inv_norm;
                chunk[5] *= inv_norm;
                chunk[6] *= inv_norm;
                chunk[7] *= inv_norm;
            }
            for val in remainder_mut {
                *val *= inv_norm;
            }
        }
    }

    /// Computes L2 Euclidean distance between two vectors with 8-wide SIMD unrolling (< 100 ns)
    pub fn distance_l2(a: &[f32], b: &[f32]) -> f32 {
        let len = a.len().min(b.len());
        if len == 0 {
            return f32::MAX;
        }

        let (a_chunks, a_rem) = a[..len].as_chunks::<8>();
        let (b_chunks, b_rem) = b[..len].as_chunks::<8>();

        let mut acc0 = 0.0f32;
        let mut acc1 = 0.0f32;
        let mut acc2 = 0.0f32;
        let mut acc3 = 0.0f32;
        let mut acc4 = 0.0f32;
        let mut acc5 = 0.0f32;
        let mut acc6 = 0.0f32;
        let mut acc7 = 0.0f32;

        for (ac, bc) in a_chunks.iter().zip(b_chunks.iter()) {
            let d0 = ac[0] - bc[0];
            let d1 = ac[1] - bc[1];
            let d2 = ac[2] - bc[2];
            let d3 = ac[3] - bc[3];
            let d4 = ac[4] - bc[4];
            let d5 = ac[5] - bc[5];
            let d6 = ac[6] - bc[6];
            let d7 = ac[7] - bc[7];

            acc0 += d0 * d0;
            acc1 += d1 * d1;
            acc2 += d2 * d2;
            acc3 += d3 * d3;
            acc4 += d4 * d4;
            acc5 += d5 * d5;
            acc6 += d6 * d6;
            acc7 += d7 * d7;
        }

        let mut sum_sq = acc0 + acc1 + acc2 + acc3 + acc4 + acc5 + acc6 + acc7;
        for (&x, &y) in a_rem.iter().zip(b_rem.iter()) {
            let diff = x - y;
            sum_sq += diff * diff;
        }

        sum_sq.sqrt()
    }

    /// Computes dot product between two vectors with 8-wide SIMD unrolling
    pub fn dot_product(a: &[f32], b: &[f32]) -> f32 {
        let len = a.len().min(b.len());
        if len == 0 {
            return 0.0;
        }

        let (a_chunks, a_rem) = a[..len].as_chunks::<8>();
        let (b_chunks, b_rem) = b[..len].as_chunks::<8>();

        let mut dp0 = 0.0f32;
        let mut dp1 = 0.0f32;
        let mut dp2 = 0.0f32;
        let mut dp3 = 0.0f32;
        let mut dp4 = 0.0f32;
        let mut dp5 = 0.0f32;
        let mut dp6 = 0.0f32;
        let mut dp7 = 0.0f32;

        for (ac, bc) in a_chunks.iter().zip(b_chunks.iter()) {
            dp0 += ac[0] * bc[0];
            dp1 += ac[1] * bc[1];
            dp2 += ac[2] * bc[2];
            dp3 += ac[3] * bc[3];
            dp4 += ac[4] * bc[4];
            dp5 += ac[5] * bc[5];
            dp6 += ac[6] * bc[6];
            dp7 += ac[7] * bc[7];
        }

        let mut total = dp0 + dp1 + dp2 + dp3 + dp4 + dp5 + dp6 + dp7;
        for (&x, &y) in a_rem.iter().zip(b_rem.iter()) {
            total += x * y;
        }

        total
    }

    /// Computes cosine similarity in-place without dynamic allocations
    pub fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
        let dot = Self::dot_product(a, b);
        let norm_a = Self::dot_product(a, a).sqrt();
        let norm_b = Self::dot_product(b, b).sqrt();

        if norm_a > 1e-8 && norm_b > 1e-8 {
            (dot / (norm_a * norm_b)).clamp(-1.0, 1.0)
        } else {
            0.0
        }
    }

    /// Scalar baseline implementation for exact mathematical verification
    pub fn scalar_distance_l2(a: &[f32], b: &[f32]) -> f32 {
        let len = a.len().min(b.len());
        let sum_sq: f32 = a[..len]
            .iter()
            .zip(&b[..len])
            .map(|(x, y)| (x - y) * (x - y))
            .sum();
        sum_sq.sqrt()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalize_l2_empty_and_zero() {
        let mut empty: [f32; 0] = [];
        SimdFeatureVectorizer::normalize_l2(&mut empty);
        assert!(empty.is_empty());

        let mut zero = [0.0f32; 16];
        SimdFeatureVectorizer::normalize_l2(&mut zero);
        for val in zero {
            assert_eq!(val, 0.0);
        }
    }

    #[test]
    fn test_normalize_l2_various_lengths() {
        for len in [1, 2, 7, 8, 9, 15, 16, 23, 64, 128, 1536] {
            let mut v: Vec<f32> = (1..=len).map(|i| i as f32).collect();
            SimdFeatureVectorizer::normalize_l2(&mut v);

            let norm: f32 = v.iter().map(|x| x * x).sum::<f32>().sqrt();
            assert!(
                (norm - 1.0).abs() < 1e-4,
                "Vector of len {} should have unit norm, got {}",
                len,
                norm
            );
        }
    }

    #[test]
    fn test_distance_l2_matches_scalar_exact() {
        for len in [0, 1, 5, 8, 12, 16, 31, 64, 128] {
            let a: Vec<f32> = (0..len).map(|i| (i as f32 * 1.5).sin()).collect();
            let b: Vec<f32> = (0..len).map(|i| (i as f32 * 2.3).cos()).collect();

            let d_simd = SimdFeatureVectorizer::distance_l2(&a, &b);
            let d_scalar = SimdFeatureVectorizer::scalar_distance_l2(&a, &b);

            if len == 0 {
                assert_eq!(d_simd, f32::MAX);
            } else {
                assert!(
                    (d_simd - d_scalar).abs() < 1e-4,
                    "SIMD ({}) vs scalar ({}) for len {}",
                    d_simd,
                    d_scalar,
                    len
                );
            }
        }
    }

    #[test]
    fn test_dot_product_properties() {
        assert_eq!(SimdFeatureVectorizer::dot_product(&[], &[]), 0.0);

        // Orthogonal vectors
        let a = [1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0];
        let b = [0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0];
        assert_eq!(SimdFeatureVectorizer::dot_product(&a, &b), 0.0);

        // Parallel vectors
        let c = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0];
        let expected: f32 = (1..=9).map(|i| (i * i) as f32).sum();
        assert!((SimdFeatureVectorizer::dot_product(&c, &c) - expected).abs() < 1e-4);
    }

    #[test]
    fn test_cosine_similarity() {
        let a = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0];
        let b = [2.0, 4.0, 6.0, 8.0, 10.0, 12.0, 14.0, 16.0];
        let cos_same = SimdFeatureVectorizer::cosine_similarity(&a, &b);
        assert!((cos_same - 1.0).abs() < 1e-4);

        let opposite = [-1.0, -2.0, -3.0, -4.0, -5.0, -6.0, -7.0, -8.0];
        let cos_opp = SimdFeatureVectorizer::cosine_similarity(&a, &opposite);
        assert!((cos_opp - (-1.0)).abs() < 1e-4);

        let zero = [0.0; 8];
        assert_eq!(SimdFeatureVectorizer::cosine_similarity(&a, &zero), 0.0);
    }
}
