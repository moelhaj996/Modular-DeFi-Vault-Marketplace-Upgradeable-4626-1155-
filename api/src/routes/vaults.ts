import { Router } from 'express';
import { VaultController } from '../controllers/VaultController';
import { validateRequest } from '../middleware/validation';
import { rateLimit } from '../middleware/rateLimit';
import { query, param } from 'express-validator';

const router = Router();
const vaultController = new VaultController();

// Initialize controller
vaultController.initialize().catch(console.error);

// Validation rules
const vaultAddressValidation = param('vaultAddress')
  .matches(/^0x[a-fA-F0-9]{40}$/)
  .withMessage('Invalid Ethereum address format');

const assetAddressValidation = param('assetAddress')
  .matches(/^0x[a-fA-F0-9]{40}$/)
  .withMessage('Invalid Ethereum address format');

const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('sortBy').optional().isIn(['name', 'symbol', 'totalAssets', 'createdAt', 'apy']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
];

const filterValidation = [
  query('active').optional().isBoolean().withMessage('Active must be a boolean'),
  query('minTvl').optional().isNumeric().withMessage('Min TVL must be numeric'),
  query('maxTvl').optional().isNumeric().withMessage('Max TVL must be numeric'),
  query('creator').optional().matches(/^0x[a-fA-F0-9]{40}$/).withMessage('Invalid creator address'),
  query('asset').optional().matches(/^0x[a-fA-F0-9]{40}$/).withMessage('Invalid asset address')
];

// Routes

/**
 * @swagger
 * /api/vaults:
 *   get:
 *     summary: Get all vaults
 *     description: Retrieve a paginated list of all vaults with optional filtering
 *     tags: [Vaults]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, symbol, totalAssets, createdAt, apy]
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: creator
 *         schema:
 *           type: string
 *         description: Filter by creator address
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Invalid parameters
 *       500:
 *         description: Server error
 */
router.get(
  '/',
  rateLimit({ windowMs: 60000, max: 100 }), // 100 requests per minute
  [...paginationValidation, ...filterValidation],
  validateRequest,
  vaultController.getAllVaults
);

/**
 * @swagger
 * /api/vaults/{vaultAddress}:
 *   get:
 *     summary: Get vault by address
 *     description: Retrieve detailed information about a specific vault
 *     tags: [Vaults]
 *     parameters:
 *       - in: path
 *         name: vaultAddress
 *         required: true
 *         schema:
 *           type: string
 *         description: Vault contract address
 *     responses:
 *       200:
 *         description: Vault information
 *       400:
 *         description: Invalid vault address
 *       404:
 *         description: Vault not found
 */
router.get(
  '/:vaultAddress',
  rateLimit({ windowMs: 60000, max: 200 }), // 200 requests per minute
  vaultAddressValidation,
  validateRequest,
  vaultController.getVaultById
);

/**
 * @swagger
 * /api/vaults/{vaultAddress}/strategies:
 *   get:
 *     summary: Get vault strategies
 *     description: Retrieve all strategies associated with a vault
 *     tags: [Vaults]
 *     parameters:
 *       - in: path
 *         name: vaultAddress
 *         required: true
 *         schema:
 *           type: string
 *         description: Vault contract address
 *     responses:
 *       200:
 *         description: List of strategies
 *       400:
 *         description: Invalid vault address
 *       500:
 *         description: Server error
 */
router.get(
  '/:vaultAddress/strategies',
  rateLimit({ windowMs: 60000, max: 200 }),
  vaultAddressValidation,
  validateRequest,
  vaultController.getVaultStrategies
);

/**
 * @swagger
 * /api/vaults/{vaultAddress}/metrics:
 *   get:
 *     summary: Get vault metrics
 *     description: Retrieve performance metrics and analytics for a vault
 *     tags: [Vaults]
 *     parameters:
 *       - in: path
 *         name: vaultAddress
 *         required: true
 *         schema:
 *           type: string
 *         description: Vault contract address
 *     responses:
 *       200:
 *         description: Vault metrics
 *       400:
 *         description: Invalid vault address
 *       500:
 *         description: Server error
 */
router.get(
  '/:vaultAddress/metrics',
  rateLimit({ windowMs: 60000, max: 100 }),
  vaultAddressValidation,
  validateRequest,
  vaultController.getVaultMetrics
);

/**
 * @swagger
 * /api/vaults/{vaultAddress}/health:
 *   get:
 *     summary: Check vault health
 *     description: Check if a vault is operating normally
 *     tags: [Vaults]
 *     parameters:
 *       - in: path
 *         name: vaultAddress
 *         required: true
 *         schema:
 *           type: string
 *         description: Vault contract address
 *     responses:
 *       200:
 *         description: Health status
 *       400:
 *         description: Invalid vault address
 *       500:
 *         description: Server error
 */
router.get(
  '/:vaultAddress/health',
  rateLimit({ windowMs: 60000, max: 300 }),
  vaultAddressValidation,
  validateRequest,
  vaultController.getVaultHealth
);

/**
 * @swagger
 * /api/assets/{assetAddress}:
 *   get:
 *     summary: Get asset information
 *     description: Retrieve information about an ERC-20 token
 *     tags: [Assets]
 *     parameters:
 *       - in: path
 *         name: assetAddress
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset contract address
 *     responses:
 *       200:
 *         description: Asset information
 *       400:
 *         description: Invalid asset address
 *       404:
 *         description: Asset not found
 */
router.get(
  '/assets/:assetAddress',
  rateLimit({ windowMs: 60000, max: 500 }),
  assetAddressValidation,
  validateRequest,
  vaultController.getAssetInfo
);

export default router;