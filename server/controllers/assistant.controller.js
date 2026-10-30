const assistantService = require('../services/assistantService');
const legalRagService = require('../services/legalRagService');
const assistantDbService = require('../services/assistantDbService');

exports.chat = async (req, res) => {
  try {
    const { message, sessionContext, conversationId } = req.body;
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(422).json({
        success: false,
        message: 'Validation Error: message is required and must be a non-empty string'
      });
    }

    if (message.length > 4000) {
      return res.status(422).json({
        success: false,
        message: 'Validation Error: message exceeds maximum allowed length of 4000 characters'
      });
    }

    const response = await assistantService.processChatQuery(
      req.user,
      message.trim(),
      sessionContext || {},
      conversationId || null
    );

    return res.status(200).json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('[AssistantController] Chat error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process AI Safety Assistant query',
      error: error.message
    });
  }
};

exports.listConversations = async (req, res) => {
  try {
    const userId = req.user ? String(req.user._id || req.user.id) : 'anonymous';
    const { limit, offset } = req.query;

    const conversations = await assistantDbService.listConversations(userId, { limit, offset });
    return res.status(200).json({
      success: true,
      data: conversations
    });
  } catch (error) {
    console.error('[AssistantController] List conversations error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch conversations',
      error: error.message
    });
  }
};

exports.getConversationMessages = async (req, res) => {
  try {
    const userId = req.user ? String(req.user._id || req.user.id) : 'anonymous';
    const { id } = req.params;
    const { limit, offset } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Conversation ID is required'
      });
    }

    // Verify conversation exists and belongs to user
    const conversation = await assistantDbService.getConversation(id, userId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found or access denied'
      });
    }

    const messages = await assistantDbService.getMessages(id, userId, { limit, offset });
    return res.status(200).json({
      success: true,
      data: {
        conversation,
        messages
      }
    });
  } catch (error) {
    console.error('[AssistantController] Get messages error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch conversation messages',
      error: error.message
    });
  }
};

exports.deleteConversation = async (req, res) => {
  try {
    const userId = req.user ? String(req.user._id || req.user.id) : 'anonymous';
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Conversation ID is required'
      });
    }

    const archived = await assistantDbService.archiveConversation(id, userId);
    if (!archived) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found or access denied'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Conversation archived successfully'
    });
  } catch (error) {
    console.error('[AssistantController] Delete conversation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete conversation',
      error: error.message
    });
  }
};

exports.getCaseStudies = async (req, res) => {
  try {
    const { actIdentifier, sectionNumber, search, limit, offset } = req.query;
    const cases = await assistantDbService.searchCaseStudies({
      actIdentifier,
      sectionNumber,
      search,
      limit,
      offset
    });

    return res.status(200).json({
      success: true,
      data: cases
    });
  } catch (error) {
    console.error('[AssistantController] Case studies search error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to search case studies',
      error: error.message
    });
  }
};

exports.getStudyProgress = async (req, res) => {
  try {
    const userId = req.user ? String(req.user._id || req.user.id) : 'anonymous';
    const { actIdentifier, sectionNumber } = req.query;

    if (!actIdentifier || !sectionNumber) {
      return res.status(400).json({
        success: false,
        message: 'actIdentifier and sectionNumber are required'
      });
    }

    const progress = await assistantDbService.getStudyProgress(userId, actIdentifier, sectionNumber);
    return res.status(200).json({
      success: true,
      data: progress
    });
  } catch (error) {
    console.error('[AssistantController] Study progress error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch study progress',
      error: error.message
    });
  }
};

exports.submitQuiz = async (req, res) => {
  try {
    const userId = req.user ? String(req.user._id || req.user.id) : 'anonymous';
    const { actIdentifier, sectionNumber, questionText, selectedOption, correctOption, explanation } = req.body;

    if (!actIdentifier || !sectionNumber || !questionText || !selectedOption || !correctOption) {
      return res.status(422).json({
        success: false,
        message: 'actIdentifier, sectionNumber, questionText, selectedOption, and correctOption are required'
      });
    }

    const isCorrect = String(selectedOption).toUpperCase() === String(correctOption).toUpperCase();
    const score = isCorrect ? 100 : 0;

    const attempt = await assistantDbService.recordQuizAttempt(userId, {
      actIdentifier,
      sectionNumber,
      questionText,
      selectedOption: String(selectedOption).toUpperCase(),
      correctOption: String(correctOption).toUpperCase(),
      isCorrect,
      explanation,
      score
    });

    return res.status(200).json({
      success: true,
      data: attempt
    });
  } catch (error) {
    console.error('[AssistantController] Quiz submit error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to record quiz attempt',
      error: error.message
    });
  }
};

exports.getTaxonomy = async (req, res) => {
  try {
    const data = await legalRagService.getCorpusTaxonomy();
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[AssistantController] Taxonomy error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch Case Explorer taxonomy',
      error: error.message
    });
  }
};

exports.getExplorerCases = async (req, res) => {
  try {
    const { category, actCode, section, search } = req.query;
    const data = await legalRagService.getExplorerCases({ category, actCode, section, search });
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[AssistantController] Explorer cases error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch Case Explorer cases',
      error: error.message
    });
  }
};
