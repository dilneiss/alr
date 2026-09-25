use alr_spatial::city_routing::{CityRouteOptimizer, RouteOptimizationParams};

#[test]
fn test_city_routing_50_stops_optimization() {
    let optimizer = CityRouteOptimizer::new();
    let params = RouteOptimizationParams {
        depot_x: 80.0,
        depot_y: 80.0,
        num_deliveries: 50,
        traffic_regime: "rush_hour".to_string(),
        stop_duration_mins: 8,
        shift_hours_limit: 8.0,
        algorithm: "hybrid_2opt".to_string(),
    };

    let plan = optimizer
        .optimize_delivery_route(&params)
        .expect("Failed to optimize 50 deliveries route");

    assert_eq!(plan.total_deliveries, 50);
    assert_eq!(plan.itinerary.len(), 50);
    assert!(plan.total_distance_km > 10.0);
    assert!(plan.total_journey_hours > 0.0);
    assert!(plan.optimization_latency_micros < 50_000); // Sub-50ms em debug, < 5ms em release
    assert!(plan.distance_savings_pct > 15.0); // 2-Opt deve economizar mais de 15% vs sequencial
    assert!(!plan.route_polyline.is_empty());
}

#[test]
fn test_city_routing_traffic_regimes_impact() {
    let optimizer = CityRouteOptimizer::new();

    let fluid_params = RouteOptimizationParams {
        traffic_regime: "fluid".to_string(),
        ..Default::default()
    };
    let rain_params = RouteOptimizationParams {
        traffic_regime: "rain".to_string(),
        ..Default::default()
    };

    let fluid_plan = optimizer
        .optimize_delivery_route(&fluid_params)
        .expect("Fluid plan failed");
    let rain_plan = optimizer
        .optimize_delivery_route(&rain_params)
        .expect("Rain plan failed");

    // Chuva intensa deve aumentar o tempo de trânsito e reduzir a velocidade média
    assert!(rain_plan.transit_hours > fluid_plan.transit_hours);
    assert!(rain_plan.average_speed_kmh < fluid_plan.average_speed_kmh);
}

#[test]
fn test_city_routing_depot_pin_repositioning() {
    let optimizer = CityRouteOptimizer::new();

    let params_custom_pin = RouteOptimizationParams {
        depot_x: 420.0,
        depot_y: 350.0,
        num_deliveries: 25,
        ..Default::default()
    };

    let plan = optimizer
        .optimize_delivery_route(&params_custom_pin)
        .expect("Custom depot plan failed");

    assert_eq!(plan.depot.x, 420.0);
    assert_eq!(plan.depot.y, 350.0);
    assert_eq!(plan.itinerary.len(), 25);
    assert_eq!(plan.route_polyline[0], (420.0, 350.0));
}

#[test]
fn test_city_routing_shift_capacity_constraint() {
    let optimizer = CityRouteOptimizer::new();

    // Turno ultra-curto de 2.0 horas com 50 paradas deve exceder a capacidade
    let short_shift = RouteOptimizationParams {
        num_deliveries: 50,
        stop_duration_mins: 8,
        shift_hours_limit: 2.0,
        ..Default::default()
    };
    let plan_short = optimizer
        .optimize_delivery_route(&short_shift)
        .expect("Short shift plan failed");

    assert!(plan_short.is_shift_exceeded);
    assert!(plan_short.overflow_deliveries > 0);
    assert!(plan_short.completed_in_shift < 50);

    // Turno expandido de 12.0 horas deve comportar as 50 paradas
    let long_shift = RouteOptimizationParams {
        num_deliveries: 50,
        stop_duration_mins: 5,
        shift_hours_limit: 12.0,
        traffic_regime: "fluid".to_string(),
        ..Default::default()
    };
    let plan_long = optimizer
        .optimize_delivery_route(&long_shift)
        .expect("Long shift plan failed");

    assert!(!plan_long.is_shift_exceeded);
    assert_eq!(plan_long.completed_in_shift, 50);
    assert_eq!(plan_long.overflow_deliveries, 0);
}
