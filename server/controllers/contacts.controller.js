const contactService = require('../services/contactService');

/**
 * contacts.controller — SURAKSHA AI
 *
 * Thin HTTP controller for Trusted Circle endpoints (Rules.md §4).
 * Enforces ownership and passes validated inputs to contactService.
 */

/**
 * GET /api/contacts
 * Protected — returns all trusted contacts for the authenticated user
 */
const getContacts = async (req, res, next) => {
  try {
    const contacts = await contactService.getContacts(req.user.id);

    return res.status(200).json({
      success: true,
      data: contacts
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/contacts/active
 * Protected — returns active trusted contacts prepared for emergency dispatch
 */
const getActiveContacts = async (req, res, next) => {
  try {
    const contacts = await contactService.getActiveContacts(req.user.id);

    return res.status(200).json({
      success: true,
      data: contacts
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/contacts
 * Protected — adds a new trusted contact
 */
const addContact = async (req, res, next) => {
  try {
    const contact = await contactService.addContact(req.user.id, req.body);

    return res.status(201).json({
      success: true,
      message: 'Trusted contact added',
      data: contact
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/contacts/:contactId
 * Protected — updates an existing trusted contact
 */
const updateContact = async (req, res, next) => {
  try {
    const contact = await contactService.updateContact(
      req.user.id,
      req.params.contactId,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: 'Trusted contact updated',
      data: contact
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/contacts/:contactId
 * Protected — removes a trusted contact from the circle
 */
const deleteContact = async (req, res, next) => {
  try {
    await contactService.deleteContact(req.user.id, req.params.contactId);

    return res.status(200).json({
      success: true,
      message: 'Trusted contact removed'
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getContacts,
  getActiveContacts,
  addContact,
  updateContact,
  deleteContact
};
