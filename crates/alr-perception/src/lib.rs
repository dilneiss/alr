pub mod attributes;
pub mod capture;
pub mod cctv;
pub mod error_detector;
pub mod image;
pub mod perception_3d;
pub mod snake;

pub use attributes::{
    BackgroundType, ColorSwatch, DetectedShape, ExtractedVisualAttributes, ImageColorProfile,
    ImageDimensions, VisualAttributeExtractor,
};
pub use capture::{CaptureRegion, ScreenCapturer, SimulatedScreenCapturer};
pub use cctv::{
    BoundingBox, CctvSurveillanceEngine, DetectedEntityKind, PerimeterZone, SurveillanceEvent,
    ThreatLevel,
};
pub use error_detector::{ErrorScreenType, ScreenErrorDetector, ScreenErrorVerdict};
pub use image::{RawImage, RgbaColor};
pub use perception_3d::{CameraState, Visual3DPerception, VisualDetection};
pub use snake::{DetectedSnakeState, VisualDirection, VisualPosition, VisualSnakeDetector};
