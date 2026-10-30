const mongoose = require('mongoose');

/**
 * TrustedContact model — SURAKSHA AI
 *
 * Schema matches Database.md section 5: TrustedContact
 * Stores individuals selected by the user to receive emergency alerts.
 */
const trustedContactSchema = new mongoose.Schema(
  {
    // Reference to the user who owns this contact
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true
    },

    name: {
      type: String,
      required: [true, 'Contact name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },

    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },

    // Allowed relationship values per Database.md section 5
    relationship: {
      type: String,
      enum: {
        values: ['parent', 'friend', 'relative', 'other'],
        message: 'Relationship must be parent, friend, relative, or other'
      },
      default: 'other'
    },

    // Active status determines if this contact is included during emergency notifications
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true // auto-manages createdAt and updatedAt
  }
);

// Compound index for querying active contacts for a user — Database.md section 5
trustedContactSchema.index({ user: 1, isActive: 1 });

const TrustedContact = mongoose.model('TrustedContact', trustedContactSchema);

module.exports = TrustedContact;
