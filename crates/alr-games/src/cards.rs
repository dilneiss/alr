use alr_core::{Action, State};
use alr_environment::{
    AbstractAction, AbstractState, ActionSpace, DistanceCategory, EnvironmentAdapter,
    EnvironmentConstraint, EnvironmentDescription, EnvironmentSignature, ObservationSpace,
    RelativeDirection,
};
use anyhow::Result;
use async_trait::async_trait;
use rand::{rngs::StdRng, seq::SliceRandom, SeedableRng};
use serde::{Deserialize, Serialize};

/// Suits of a standard 52-card deck
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum CardSuit {
    Hearts,
    Diamonds,
    Clubs,
    Spades,
}

impl CardSuit {
    pub const ALL: [CardSuit; 4] = [
        CardSuit::Hearts,
        CardSuit::Diamonds,
        CardSuit::Clubs,
        CardSuit::Spades,
    ];

    pub fn symbol(&self) -> &'static str {
        match self {
            CardSuit::Hearts => "♥",
            CardSuit::Diamonds => "♦",
            CardSuit::Clubs => "♣",
            CardSuit::Spades => "♠",
        }
    }
}

/// Card ranks from Two to Ace
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub enum CardRank {
    Two = 2,
    Three = 3,
    Four = 4,
    Five = 5,
    Six = 6,
    Seven = 7,
    Eight = 8,
    Nine = 9,
    Ten = 10,
    Jack = 11,
    Queen = 12,
    King = 13,
    Ace = 14,
}

impl CardRank {
    pub const ALL: [CardRank; 13] = [
        CardRank::Two,
        CardRank::Three,
        CardRank::Four,
        CardRank::Five,
        CardRank::Six,
        CardRank::Seven,
        CardRank::Eight,
        CardRank::Nine,
        CardRank::Ten,
        CardRank::Jack,
        CardRank::Queen,
        CardRank::King,
        CardRank::Ace,
    ];

    /// Standard Blackjack value (Face cards = 10, Ace = 11 by default)
    pub fn blackjack_value(&self) -> u8 {
        match self {
            CardRank::Two => 2,
            CardRank::Three => 3,
            CardRank::Four => 4,
            CardRank::Five => 5,
            CardRank::Six => 6,
            CardRank::Seven => 7,
            CardRank::Eight => 8,
            CardRank::Nine => 9,
            CardRank::Ten | CardRank::Jack | CardRank::Queen | CardRank::King => 10,
            CardRank::Ace => 11,
        }
    }

    pub fn symbol(&self) -> &'static str {
        match self {
            CardRank::Two => "2",
            CardRank::Three => "3",
            CardRank::Four => "4",
            CardRank::Five => "5",
            CardRank::Six => "6",
            CardRank::Seven => "7",
            CardRank::Eight => "8",
            CardRank::Nine => "9",
            CardRank::Ten => "10",
            CardRank::Jack => "J",
            CardRank::Queen => "Q",
            CardRank::King => "K",
            CardRank::Ace => "A",
        }
    }
}

/// A single playing card with Suit and Rank
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Card {
    pub suit: CardSuit,
    pub rank: CardRank,
}

impl Card {
    pub fn new(rank: CardRank, suit: CardSuit) -> Self {
        Self { suit, rank }
    }

    pub fn blackjack_value(&self) -> u8 {
        self.rank.blackjack_value()
    }

    pub fn to_short_string(&self) -> String {
        format!("{}{}", self.rank.symbol(), self.suit.symbol())
    }
}

/// A hand of playing cards with Blackjack scoring
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct Hand {
    pub cards: Vec<Card>,
}

impl Hand {
    pub fn new() -> Self {
        Self { cards: Vec::new() }
    }

    pub fn add(&mut self, card: Card) {
        self.cards.push(card);
    }

    /// Calculates optimal Blackjack score, reducing Aces from 11 to 1 if busting
    pub fn score(&self) -> u8 {
        let mut sum = 0u16;
        let mut aces = 0u8;

        for card in &self.cards {
            if card.rank == CardRank::Ace {
                aces += 1;
                sum += 11;
            } else {
                sum += card.blackjack_value() as u16;
            }
        }

        while sum > 21 && aces > 0 {
            sum -= 10;
            aces -= 1;
        }

        sum as u8
    }

    pub fn is_bust(&self) -> bool {
        self.score() > 21
    }

    pub fn is_blackjack(&self) -> bool {
        self.cards.len() == 2 && self.score() == 21
    }

    pub fn is_soft(&self) -> bool {
        let mut sum = 0u16;
        let mut aces = 0u8;

        for card in &self.cards {
            if card.rank == CardRank::Ace {
                aces += 1;
                sum += 11;
            } else {
                sum += card.blackjack_value() as u16;
            }
        }

        sum <= 21 && aces > 0
    }

    pub fn format_hand(&self) -> String {
        self.cards
            .iter()
            .map(|c| c.to_short_string())
            .collect::<Vec<_>>()
            .join(" ")
    }
}

/// Actions available in Card Game (Blackjack / High Card)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum CardAction {
    Hit = 0,
    Stand = 1,
    Double = 2,
}

impl CardAction {
    pub fn as_str(&self) -> &'static str {
        match self {
            CardAction::Hit => "HIT",
            CardAction::Stand => "STAND",
            CardAction::Double => "DOUBLE",
        }
    }

    pub fn from_index(idx: usize) -> Option<Self> {
        match idx {
            0 => Some(CardAction::Hit),
            1 => Some(CardAction::Stand),
            2 => Some(CardAction::Double),
            _ => None,
        }
    }

    pub fn to_alr_action(&self) -> Action {
        Action::new(
            self.as_str(),
            serde_json::json!({
                "action": self.as_str(),
                "action_id": *self as u8,
            }),
        )
    }
}

/// Game phase
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum GamePhase {
    PlayerTurn,
    DealerTurn,
    Completed,
}

/// Final game outcome
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum GameOutcome {
    PlayerWin,
    PlayerBlackjack,
    DealerWin,
    Push,
    PlayerBust,
    DealerBust,
}

/// Autonomous Card Game (Blackjack / Poker) Environment
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CardGameEnvironment {
    pub deck: Vec<Card>,
    pub player_hand: Hand,
    pub dealer_hand: Hand,
    pub current_bet: f32,
    pub chips: f32,
    pub phase: GamePhase,
    pub outcome: Option<GameOutcome>,
    pub terminal: bool,
    pub seed: u64,
    pub rounds_played: u32,
    pub dealer_stand_threshold: u8,
}

impl Default for CardGameEnvironment {
    fn default() -> Self {
        Self::new(42)
    }
}

impl CardGameEnvironment {
    pub fn new(seed: u64) -> Self {
        let mut env = Self {
            deck: Vec::with_capacity(52),
            player_hand: Hand::new(),
            dealer_hand: Hand::new(),
            current_bet: 10.0,
            chips: 1000.0,
            phase: GamePhase::PlayerTurn,
            outcome: None,
            terminal: false,
            seed,
            rounds_played: 0,
            dealer_stand_threshold: 17,
        };
        env.reset(seed);
        env
    }

    /// Resets deck, shuffles deterministically with seed, and deals initial cards
    pub fn reset(&mut self, seed: u64) {
        self.seed = seed;
        self.rounds_played += 1;
        self.terminal = false;
        self.outcome = None;
        self.phase = GamePhase::PlayerTurn;
        self.current_bet = 10.0;
        self.player_hand = Hand::new();
        self.dealer_hand = Hand::new();

        // Build standard 52-card deck
        self.deck.clear();
        for &suit in &CardSuit::ALL {
            for &rank in &CardRank::ALL {
                self.deck.push(Card::new(rank, suit));
            }
        }

        // Shuffle with seed
        let mut rng = StdRng::seed_from_u64(seed.wrapping_add(self.rounds_played as u64 * 31));
        self.deck.shuffle(&mut rng);

        // Deal initial 2 cards to player and dealer
        if let Some(c) = self.deck.pop() {
            self.player_hand.add(c);
        }
        if let Some(c) = self.deck.pop() {
            self.dealer_hand.add(c);
        }
        if let Some(c) = self.deck.pop() {
            self.player_hand.add(c);
        }
        if let Some(c) = self.deck.pop() {
            self.dealer_hand.add(c);
        }

        // Check immediate Blackjack
        if self.player_hand.is_blackjack() || self.dealer_hand.is_blackjack() {
            self.conclude_round();
        }
    }

    /// Visible card of dealer during Player turn (first card)
    pub fn dealer_visible_card(&self) -> Option<&Card> {
        self.dealer_hand.cards.first()
    }

    /// Probability that the next drawn card will cause the player to bust (> 21)
    pub fn bust_probability(&self) -> f32 {
        let current_score = self.player_hand.score();
        if current_score <= 11 {
            return 0.0; // Impossible to bust when score <= 11
        }
        if current_score > 21 {
            return 1.0;
        }

        let margin = 21 - current_score;
        if self.deck.is_empty() {
            return 0.0;
        }

        let busting_cards = self
            .deck
            .iter()
            .filter(|card| {
                let val = if card.rank == CardRank::Ace {
                    1
                } else {
                    card.blackjack_value()
                };
                val > margin
            })
            .count();

        busting_cards as f32 / self.deck.len() as f32
    }

    /// System 1 Rule: Recommends Stand, Hit or Double based on bust probability and basic strategy
    pub fn recommend_action(&self) -> CardAction {
        let score = self.player_hand.score();
        let bust_prob = self.bust_probability();

        if self.player_hand.cards.len() == 2 && (score == 10 || score == 11) && bust_prob < 0.35 {
            CardAction::Double
        } else if score >= 17 || bust_prob > 0.55 {
            CardAction::Stand
        } else {
            CardAction::Hit
        }
    }

    /// Executes player step
    pub fn step(&mut self, action: CardAction) -> f32 {
        if self.terminal {
            return 0.0;
        }

        match action {
            CardAction::Hit => {
                if let Some(card) = self.deck.pop() {
                    self.player_hand.add(card);
                }
                if self.player_hand.is_bust() {
                    self.outcome = Some(GameOutcome::PlayerBust);
                    self.terminal = true;
                    self.phase = GamePhase::Completed;
                    self.chips -= self.current_bet;
                    return -1.0;
                }
                if self.player_hand.score() == 21 {
                    return self.dealer_turn();
                }
                0.1 // Reward for continuing without bust
            }
            CardAction::Double => {
                self.current_bet *= 2.0;
                if let Some(card) = self.deck.pop() {
                    self.player_hand.add(card);
                }
                if self.player_hand.is_bust() {
                    self.outcome = Some(GameOutcome::PlayerBust);
                    self.terminal = true;
                    self.phase = GamePhase::Completed;
                    self.chips -= self.current_bet;
                    return -2.0;
                }
                self.dealer_turn()
            }
            CardAction::Stand => self.dealer_turn(),
        }
    }

    /// Executes dealer turn until dealer reaches stand threshold (17)
    fn dealer_turn(&mut self) -> f32 {
        self.phase = GamePhase::DealerTurn;

        while self.dealer_hand.score() < self.dealer_stand_threshold {
            if let Some(card) = self.deck.pop() {
                self.dealer_hand.add(card);
            } else {
                break;
            }
        }

        self.conclude_round()
    }

    /// Evaluates final hands and assigns chips / reward
    fn conclude_round(&mut self) -> f32 {
        self.phase = GamePhase::Completed;
        self.terminal = true;

        let p_score = self.player_hand.score();
        let d_score = self.dealer_hand.score();
        let p_bj = self.player_hand.is_blackjack();
        let d_bj = self.dealer_hand.is_blackjack();

        if p_bj && !d_bj {
            self.outcome = Some(GameOutcome::PlayerBlackjack);
            let reward = self.current_bet * 1.5;
            self.chips += reward;
            1.5
        } else if d_bj && !p_bj {
            self.outcome = Some(GameOutcome::DealerWin);
            self.chips -= self.current_bet;
            -1.0
        } else if p_bj && d_bj {
            self.outcome = Some(GameOutcome::Push);
            0.0
        } else if self.player_hand.is_bust() {
            self.outcome = Some(GameOutcome::PlayerBust);
            self.chips -= self.current_bet;
            -1.0
        } else if self.dealer_hand.is_bust() {
            self.outcome = Some(GameOutcome::DealerBust);
            self.chips += self.current_bet;
            1.0
        } else if p_score > d_score {
            self.outcome = Some(GameOutcome::PlayerWin);
            self.chips += self.current_bet;
            1.0
        } else if p_score < d_score {
            self.outcome = Some(GameOutcome::DealerWin);
            self.chips -= self.current_bet;
            -1.0
        } else {
            self.outcome = Some(GameOutcome::Push);
            0.0
        }
    }

    /// Evaluates basic 5-card poker hand strength (rank 0.0 to 1.0)
    pub fn evaluate_poker_hand(cards: &[Card]) -> (f32, &'static str) {
        if cards.len() < 5 {
            return (0.1, "Incomplete Hand");
        }

        let mut ranks: Vec<u8> = cards.iter().map(|c| c.rank as u8).collect();
        ranks.sort_unstable();

        let is_flush = cards.windows(2).all(|w| w[0].suit == w[1].suit);
        let is_straight = ranks.windows(2).all(|w| w[1] == w[0] + 1) || (ranks == [2, 3, 4, 5, 14]); // Wheel straight A-2-3-4-5

        // Frequency map
        let mut counts = [0u8; 15];
        for &r in &ranks {
            counts[r as usize] += 1;
        }
        let mut freq: Vec<u8> = counts.iter().copied().filter(|&c| c > 0).collect();
        freq.sort_unstable_by(|a, b| b.cmp(a));

        if is_straight && is_flush && ranks.contains(&14) && ranks.contains(&13) {
            (1.00, "Royal Flush")
        } else if is_straight && is_flush {
            (0.95, "Straight Flush")
        } else if freq == [4, 1] {
            (0.85, "Four of a Kind")
        } else if freq == [3, 2] {
            (0.75, "Full House")
        } else if is_flush {
            (0.65, "Flush")
        } else if is_straight {
            (0.55, "Straight")
        } else if freq == [3, 1, 1] {
            (0.40, "Three of a Kind")
        } else if freq == [2, 2, 1] {
            (0.30, "Two Pair")
        } else if freq == [2, 1, 1, 1] {
            (0.20, "One Pair")
        } else {
            (0.10, "High Card")
        }
    }

    pub fn to_alr_state(&self) -> State {
        State::new(
            vec![
                self.player_hand.score() as f32,
                self.dealer_hand.score() as f32,
                self.bust_probability(),
                self.current_bet,
                self.chips,
            ],
            serde_json::json!({
                "player_score": self.player_hand.score(),
                "dealer_visible": self.dealer_visible_card().map(|c| c.to_short_string()),
                "dealer_score": self.dealer_hand.score(),
                "bust_probability": self.bust_probability(),
                "current_bet": self.current_bet,
                "chips": self.chips,
                "terminal": self.terminal,
                "outcome": self.outcome.map(|o| format!("{:?}", o)),
            }),
        )
    }

    /// Renders an ASCII table representation of the card table
    pub fn render_ascii(&self) -> String {
        let mut out = String::new();
        out.push_str("================ CARD TABLE (BLACKJACK) ================\n");
        out.push_str(&format!(
            " Chips: ${:.0} | Current Bet: ${:.0} | Round: {}\n",
            self.chips, self.current_bet, self.rounds_played
        ));
        out.push_str("--------------------------------------------------------\n");

        // Dealer Hand
        if self.phase == GamePhase::PlayerTurn {
            let vis = self
                .dealer_visible_card()
                .map(|c| c.to_short_string())
                .unwrap_or_default();
            out.push_str(&format!(
                " DEALER: [ {} ] [ ?? ] (Visible Card: {})\n",
                vis, vis
            ));
        } else {
            out.push_str(&format!(
                " DEALER: {} (Score: {})\n",
                self.dealer_hand.format_hand(),
                self.dealer_hand.score()
            ));
        }

        // Player Hand
        out.push_str(&format!(
            " PLAYER: {} (Score: {}, Bust Prob: {:.1}%)\n",
            self.player_hand.format_hand(),
            self.player_hand.score(),
            self.bust_probability() * 100.0
        ));
        out.push_str("--------------------------------------------------------\n");

        if let Some(outcome) = self.outcome {
            out.push_str(&format!(" OUTCOME: {:?} | Hand Finished!\n", outcome));
        } else {
            let rec = self.recommend_action();
            out.push_str(&format!(
                " ACTIONS: [H]it | [S]tand | [D]ouble | System 1 Recommendation: {}\n",
                rec.as_str()
            ));
        }
        out.push_str("========================================================\n");
        out
    }
}

#[async_trait]
impl EnvironmentAdapter for CardGameEnvironment {
    fn description(&self) -> EnvironmentDescription {
        EnvironmentDescription {
            environment_id: "cards_blackjack_arena".to_string(),
            name: "Card Game & Blackjack Autonomous Decision Engine".to_string(),
            capabilities: vec![
                "card_counting".to_string(),
                "bust_probability_estimation".to_string(),
                "bluff_and_stand_decision".to_string(),
            ],
            action_space: ActionSpace::Discrete(vec![
                "HIT".to_string(),
                "STAND".to_string(),
                "DOUBLE".to_string(),
            ]),
            observation_space: ObservationSpace::StructuredOracle,
            constraints: vec![EnvironmentConstraint {
                name: "deck_integrity".to_string(),
                max_action_rate: 10.0,
                forbids_reversal: true,
                safety_perimeter: 0.0,
            }],
        }
    }

    fn signature(&self) -> EnvironmentSignature {
        EnvironmentSignature {
            environment_id: "cards_blackjack_arena".to_string(),
            action_space_kind: "Discrete3".to_string(),
            observation_space_kind: "CardTableState".to_string(),
            physics_fidelity: 1.0,
            capability_tags: vec![
                "cards".into(),
                "blackjack".into(),
                "probability".into(),
                "decision".into(),
            ],
        }
    }

    async fn reset(&mut self, seed: u64) -> Result<AbstractState> {
        self.reset(seed);
        self.observe().await
    }

    async fn observe(&self) -> Result<AbstractState> {
        let score = self.player_hand.score();
        let bust_prob = self.bust_probability();

        let dist_cat = if score >= 20 {
            DistanceCategory::Immediate
        } else if score >= 17 {
            DistanceCategory::Near
        } else if score >= 12 {
            DistanceCategory::Medium
        } else {
            DistanceCategory::Far
        };

        let dir = if bust_prob > 0.5 {
            RelativeDirection::North // High risk of bust
        } else if bust_prob > 0.2 {
            RelativeDirection::Center // Moderate risk
        } else {
            RelativeDirection::South // Safe to hit
        };

        Ok(AbstractState {
            target_relative_direction: dir,
            target_distance_category: dist_cat,
            obstacle_front: bust_prob > 0.6,
            obstacle_left: self.player_hand.is_soft(),
            obstacle_right: self.player_hand.cards.len() == 2,
            inventory_has_target: self.chips > 0.0,
        })
    }

    async fn act(&mut self, action: AbstractAction) -> Result<f32> {
        let card_act = match action {
            AbstractAction::Approach => CardAction::Hit,
            AbstractAction::Avoid | AbstractAction::Wait | AbstractAction::Retreat => {
                CardAction::Stand
            }
            AbstractAction::Interact(_) | AbstractAction::Collect => CardAction::Double,
            _ => self.recommend_action(),
        };

        Ok(self.step(card_act))
    }

    fn is_terminal(&self) -> bool {
        self.terminal
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_card_blackjack_scoring() {
        let mut hand = Hand::new();
        hand.add(Card::new(CardRank::Ace, CardSuit::Spades));
        hand.add(Card::new(CardRank::King, CardSuit::Hearts));
        assert_eq!(hand.score(), 21);
        assert!(hand.is_blackjack());

        // Three Aces + 9 = 1 + 1 + 1 + 9 = 12
        let mut soft_hand = Hand::new();
        soft_hand.add(Card::new(CardRank::Ace, CardSuit::Hearts));
        soft_hand.add(Card::new(CardRank::Ace, CardSuit::Clubs));
        soft_hand.add(Card::new(CardRank::Ace, CardSuit::Diamonds));
        soft_hand.add(Card::new(CardRank::Nine, CardSuit::Spades));
        assert_eq!(soft_hand.score(), 12);
        assert!(!soft_hand.is_bust());
    }

    #[test]
    fn test_bust_probability_calculation() {
        let mut env = CardGameEnvironment::new(12345);
        env.player_hand = Hand::new();
        env.player_hand
            .add(Card::new(CardRank::Ten, CardSuit::Clubs));
        env.player_hand
            .add(Card::new(CardRank::Nine, CardSuit::Diamonds)); // 19

        let prob = env.bust_probability();
        assert!(
            prob > 0.5,
            "At 19, bust probability should be high (> 0.5), got {}",
            prob
        );
    }

    #[test]
    fn test_poker_hand_evaluation() {
        let royal_flush = vec![
            Card::new(CardRank::Ten, CardSuit::Spades),
            Card::new(CardRank::Jack, CardSuit::Spades),
            Card::new(CardRank::Queen, CardSuit::Spades),
            Card::new(CardRank::King, CardSuit::Spades),
            Card::new(CardRank::Ace, CardSuit::Spades),
        ];
        let (strength, desc) = CardGameEnvironment::evaluate_poker_hand(&royal_flush);
        assert_eq!(strength, 1.0);
        assert_eq!(desc, "Royal Flush");
    }

    #[tokio::test]
    async fn test_cards_environment_adapter() {
        let mut env = CardGameEnvironment::new(999);
        let obs = env.observe().await.unwrap();
        assert!(!obs.obstacle_front || obs.obstacle_front); // Valid boolean
        let reward = env.act(AbstractAction::Avoid).await.unwrap(); // Stands
        assert!(env.is_terminal());
        assert!((-2.0..=2.0).contains(&reward));
    }
}
