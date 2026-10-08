import { COMMENT_PRIORITY, COMMENT_STATUS, REVIEW_DECISION } from '../domain/review.js';

export const STATE_VERSION = 1;
export const STORAGE_KEY = `ronda-state:v${STATE_VERSION}`;

export const createSeedState = () => ({
  schemaVersion: STATE_VERSION,
  workspace: { id: 'workspace-nebula', name: 'Nébula Studio', plan: 'studio' },
  currentUserId: 'member-julian',
  members: {
    'member-julian': { id: 'member-julian', name: 'Julian Torres', initials: 'JT', email: 'julian@nebulastudio.co', role: 'admin' },
    'member-sofia': { id: 'member-sofia', name: 'Sofía Castillo', initials: 'SC', email: 'sofia@nebulastudio.co', role: 'editor' },
    'member-mateo': { id: 'member-mateo', name: 'Mateo Ruiz', initials: 'MR', email: 'mateo@nebulastudio.co', role: 'editor' },
    'member-camila': { id: 'member-camila', name: 'Camila Pérez', initials: 'CP', email: 'camila@nebulastudio.co', role: 'reviewer' },
  },
  projects: {
    'project-amara': { id: 'project-amara', name: 'Campaña Amara', client: 'Amara Botanicals', activeVersionId: 'version-amara-v3' },
  },
  versions: {
    'version-amara-v3': {
      id: 'version-amara-v3', projectId: 'project-amara', number: 3, name: 'Spot principal · 30s',
      reviewerIds: ['member-julian', 'member-sofia', 'member-mateo', 'member-camila'],
      decisions: { 'member-julian': REVIEW_DECISION.PENDING, 'member-sofia': REVIEW_DECISION.PENDING, 'member-mateo': REVIEW_DECISION.APPROVED, 'member-camila': REVIEW_DECISION.PENDING },
    },
  },
  comments: {
    'comment-1': { id: 'comment-1', projectId: 'project-amara', versionId: 'version-amara-v3', authorId: 'member-sofia', assigneeId: 'member-julian', priority: COMMENT_PRIORITY.BLOCKING, status: COMMENT_STATUS.OPEN, text: 'Subamos un poco el contraste del texto para móvil.', timeSeconds: 21.75, frame: 522, createdAt: '2026-10-07T14:10:00.000Z' },
    'comment-2': { id: 'comment-2', projectId: 'project-amara', versionId: 'version-amara-v3', authorId: 'member-mateo', assigneeId: null, priority: COMMENT_PRIORITY.NORMAL, status: COMMENT_STATUS.RESOLVED, text: 'Este encuadre funciona.', timeSeconds: 14.08, frame: 338, createdAt: '2026-10-07T13:50:00.000Z' },
  },
  activity: [],
  notifications: {},
});
