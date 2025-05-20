/**
 * Booking Validation Middleware
 * Validates booking-related requests
 */

const { body, param, query, validationResult } = require("express-validator");
const AppError = require("../utils/appError");

/**
 * Validate create booking request
 */
exports.validateCreateBooking = [
  body("roomId")
    .notEmpty()
    .withMessage("Room ID is required")
    .isUUID()
    .withMessage("Invalid room ID format"),

  body("checkIn")
    .notEmpty()
    .withMessage("Check-in date is required")
    .isISO8601()
    .withMessage("Check-in date must be a valid ISO 8601 date")
    .custom((value, { req }) => {
      const checkInDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (checkInDate < today) {
        throw new Error("Check-in date cannot be in the past");
      }
      return true;
    }),

  body("checkOut")
    .notEmpty()
    .withMessage("Check-out date is required")
    .isISO8601()
    .withMessage("Check-out date must be a valid ISO 8601 date")
    .custom((value, { req }) => {
      if (!req.body.checkIn) return true;

      const checkInDate = new Date(req.body.checkIn);
      const checkOutDate = new Date(value);

      if (checkOutDate <= checkInDate) {
        throw new Error("Check-out date must be after check-in date");
      }
      return true;
    }),

  body("totalPrice")
    .notEmpty()
    .withMessage("Total price is required")
    .isNumeric()
    .withMessage("Total price must be a number")
    .custom((value) => {
      if (parseFloat(value) <= 0) {
        throw new Error("Total price must be greater than 0");
      }
      return true;
    }),

  body("nights")
    .notEmpty()
    .withMessage("Number of nights is required")
    .isInt({ min: 1 })
    .withMessage("Number of nights must be at least 1"),

  body("adults")
    .notEmpty()
    .withMessage("Number of adults is required")
    .isInt({ min: 1 })
    .withMessage("At least one adult is required"),

  body("children")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Number of children must be a non-negative integer"),

  body("paymentMethod")
    .notEmpty()
    .withMessage("Payment method is required")
    .isIn(["credit_card", "paypal", "cash", "bank_transfer"])
    .withMessage("Invalid payment method"),

  body("specialRequests")
    .optional()
    .isString()
    .withMessage("Special requests must be a string")
    .isLength({ max: 500 })
    .withMessage("Special requests cannot exceed 500 characters"),

  // Validation result handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }
    next();
  },
];

/**
 * Validate update booking request
 */
exports.validateUpdateBooking = [
  param("id")
    .notEmpty()
    .withMessage("Booking ID is required")
    .isUUID()
    .withMessage("Invalid booking ID format"),

  body("checkIn")
    .optional()
    .isISO8601()
    .withMessage("Check-in date must be a valid ISO 8601 date")
    .custom((value, { req }) => {
      const checkInDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (checkInDate < today) {
        throw new Error("Check-in date cannot be in the past");
      }
      return true;
    }),

  body("checkOut")
    .optional()
    .isISO8601()
    .withMessage("Check-out date must be a valid ISO 8601 date")
    .custom((value, { req }) => {
      // If both dates are provided, ensure checkOut is after checkIn
      if (req.body.checkIn) {
        const checkInDate = new Date(req.body.checkIn);
        const checkOutDate = new Date(value);

        if (checkOutDate <= checkInDate) {
          throw new Error("Check-out date must be after check-in date");
        }
      }
      return true;
    }),

  body("totalPrice")
    .optional()
    .isNumeric()
    .withMessage("Total price must be a number")
    .custom((value) => {
      if (parseFloat(value) <= 0) {
        throw new Error("Total price must be greater than 0");
      }
      return true;
    }),

  body("nights")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Number of nights must be at least 1"),

  body("adults")
    .optional()
    .isInt({ min: 1 })
    .withMessage("At least one adult is required"),

  body("children")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Number of children must be a non-negative integer"),

  body("paymentMethod")
    .optional()
    .isIn(["credit_card", "paypal", "cash", "bank_transfer"])
    .withMessage("Invalid payment method"),

  body("specialRequests")
    .optional()
    .isString()
    .withMessage("Special requests must be a string")
    .isLength({ max: 500 })
    .withMessage("Special requests cannot exceed 500 characters"),

  // Validation result handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }
    next();
  },
];

/**
 * Validate check availability request
 */
exports.validateCheckAvailability = [
  query("roomId")
    .notEmpty()
    .withMessage("Room ID is required")
    .isUUID()
    .withMessage("Invalid room ID format"),

  query("checkIn")
    .notEmpty()
    .withMessage("Check-in date is required")
    .isISO8601()
    .withMessage("Check-in date must be a valid ISO 8601 date"),

  query("checkOut")
    .notEmpty()
    .withMessage("Check-out date is required")
    .isISO8601()
    .withMessage("Check-out date must be a valid ISO 8601 date")
    .custom((value, { req }) => {
      if (!req.query.checkIn) return true;

      const checkInDate = new Date(req.query.checkIn);
      const checkOutDate = new Date(value);

      if (checkOutDate <= checkInDate) {
        throw new Error("Check-out date must be after check-in date");
      }
      return true;
    }),

  // Validation result handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }
    next();
  },
];

/**
 * Validate booking status update request
 */
exports.validateStatusUpdate = [
  param("id")
    .notEmpty()
    .withMessage("Booking ID is required")
    .isUUID()
    .withMessage("Invalid booking ID format"),

  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["pending", "confirmed", "cancelled", "completed"])
    .withMessage("Invalid status value"),

  // Validation result handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }
    next();
  },
];
