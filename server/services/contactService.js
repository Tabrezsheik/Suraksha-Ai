const TrustedContact = require('../models/TrustedContact');

/**
 * contactService — SURAKSHA AI
 *
 * Trusted Circle business logic (Rules.md §4).
 * Enforces data ownership: users can only view, edit, or delete their own contacts.
 */

/**
 * Formats a contact document for API responses.
 * @param {Object} contact - Mongoose TrustedContact document
 * @returns {Object} Safe contact data
 */
const formatContact = (contact) => ({
  id: contact._id.toString(),
  name: contact.name,
  phone: contact.phone,
  email: contact.email || null,
  relationship: contact.relationship,
  isActive: contact.isActive,
  createdAt: contact.createdAt,
  updatedAt: contact.updatedAt
});

/**
 * Retrieves all trusted contacts for the authenticated user.
 * @param {string} userId - From verified JWT
 * @returns {Array<Object>} List of contacts
 */
const getContacts = async (userId) => {
  const contacts = await TrustedContact.find({ user: userId }).sort({ createdAt: -1 });
  return contacts.map(formatContact);
};

/**
 * Retrieves all active trusted contacts for emergency notification preparation.
 * @param {string} userId - From verified JWT
 * @returns {Array<Object>} List of active contacts ready for emergency alerts
 */
const getActiveContacts = async (userId) => {
  const contacts = await TrustedContact.find({ user: userId, isActive: true }).sort({ createdAt: -1 });
  return contacts.map(formatContact);
};

/**
 * Adds a new trusted contact for the authenticated user.
 * @param {string} userId - From verified JWT
 * @param {Object} contactData - { name, phone, email, relationship, isActive }
 * @returns {Object} Created contact
 */
const addContact = async (userId, contactData) => {
  const contact = await TrustedContact.create({
    user: userId,
    name: contactData.name.trim(),
    phone: contactData.phone.trim(),
    email: contactData.email ? contactData.email.toLowerCase().trim() : null,
    relationship: contactData.relationship || 'other',
    isActive: contactData.isActive !== undefined ? Boolean(contactData.isActive) : true
  });

  return formatContact(contact);
};

/**
 * Updates an existing trusted contact with strict ownership check.
 * @param {string} userId - From verified JWT
 * @param {string} contactId - Contact ObjectId
 * @param {Object} updateData - Fields to update
 * @returns {Object} Updated contact
 */
const updateContact = async (userId, contactId, updateData) => {
  const contact = await TrustedContact.findOne({ _id: contactId, user: userId });

  if (!contact) {
    const err = new Error('Trusted contact not found');
    err.statusCode = 404;
    err.errorCode = 'CONTACT_NOT_FOUND';
    throw err;
  }

  if (updateData.name !== undefined) {
    contact.name = updateData.name.trim();
  }

  if (updateData.phone !== undefined) {
    contact.phone = updateData.phone.trim();
  }

  if (updateData.email !== undefined) {
    contact.email = updateData.email ? updateData.email.toLowerCase().trim() : null;
  }

  if (updateData.relationship !== undefined) {
    contact.relationship = updateData.relationship;
  }

  if (updateData.isActive !== undefined) {
    contact.isActive = Boolean(updateData.isActive);
  }

  await contact.save();

  return formatContact(contact);
};

/**
 * Deletes a trusted contact with strict ownership check.
 * @param {string} userId - From verified JWT
 * @param {string} contactId - Contact ObjectId
 * @returns {boolean} True if successfully removed
 */
const deleteContact = async (userId, contactId) => {
  const contact = await TrustedContact.findOneAndDelete({ _id: contactId, user: userId });

  if (!contact) {
    const err = new Error('Trusted contact not found');
    err.statusCode = 404;
    err.errorCode = 'CONTACT_NOT_FOUND';
    throw err;
  }

  return true;
};

module.exports = {
  getContacts,
  getActiveContacts,
  addContact,
  updateContact,
  deleteContact,
  formatContact
};
