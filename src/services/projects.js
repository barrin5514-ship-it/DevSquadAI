export class ProjectService {
  constructor(store, workspace) { this.store = store; this.workspace = workspace; }
  create(input) { return this.store.createProject(input, this.workspace); }
  writeFile(projectId, relative, content, approval) { const project = this.store.project(projectId); this.workspace.write(project.workspace_path, relative, content, approval); this.store.trackFile(projectId, relative, { bytes: Buffer.byteLength(content) }); }
}
