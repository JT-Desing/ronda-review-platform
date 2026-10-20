import test from 'node:test';
import assert from 'node:assert/strict';
import {workspaceEventAction} from './workspace-event-action.js';

test('workspace creation event is presented in Spanish', () => {
  assert.equal(workspaceEventAction('workspace.created'), 'Espacio de trabajo creado');
});

test('known team events are translated while unknown event types stay diagnosable', () => {
  assert.equal(workspaceEventAction('invitation.created'), 'Invitación creada');
  assert.equal(workspaceEventAction('project.comment_created'), 'Comentario añadido');
  assert.equal(workspaceEventAction('new.future.event'), 'new.future.event');
});

test('shared review resolution events are labelled by their final status', () => {
  assert.equal(workspaceEventAction('review.comment_status',{status:'resolved'}),'Comentario resuelto');
  assert.equal(workspaceEventAction('review.comment_status',{status:'open'}),'Comentario reabierto');
});
