const actions = {
  'workspace.created': 'Espacio de trabajo creado',
  'invitation.role_changed': 'Rol de invitación actualizado',
  'invitation.created': 'Invitación creada',
  'invitation.accepted': 'Invitación aceptada',
  'invitation.revoked': 'Invitación revocada',
  'member.removed': 'Miembro retirado',
  'member.role_changed': 'Rol actualizado',
  'project.created': 'Proyecto compartido creado',
  'project.updated': 'Proyecto actualizado',
  'project.comment_created': 'Comentario añadido',
  'project.comment_status': 'Estado del comentario actualizado',
};

export function workspaceEventAction(action) {
  return actions[action] || action;
}
