const mongoose = require('mongoose');

/**
 * User model — SURAKSHA AI
 *
 * Schema matches Database.md section 4: User
 * Passwords are NEVER stored in plain text.
 * passwordHash is excluded from query results by default.
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },

    // Never stored plain text. Generated server-side only.
    passwordHash: {
      type: String,
      required: true,
      select: false // Excluded from query results by default
    },

    phone: {
      type: String,
      trim: true,
      default: null
    },

    ageGroup: {
      type: String,
      trim: true,
      default: null
    },

    gender: {
      type: String,
      enum: {
        values: ['Male', 'Female', 'Other', 'Prefer not to say'],
        message: 'Gender must be Male, Female, Other, or Prefer not to say'
      },
      default: null
    },

    // Roles: 'user' (mobile user being protected) | 'dashboard_operator' (PC dashboard monitor)
    role: {
      type: String,
      enum: {
        values: ['user', 'dashboard_operator'],
        message: 'Role must be user or dashboard_operator'
      },
      default: 'user'
    },

    profilePicture: {
      type: String,
      default: null
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true // auto-manages createdAt and updatedAt
  }
);

// Indexes — Database.md section 4
// Note: email unique index is created automatically by unique:true on the field above
userSchema.index({ role: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;
