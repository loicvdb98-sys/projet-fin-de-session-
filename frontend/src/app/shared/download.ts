/**
 * Propose l'enregistrement d'un fichier reçu de l'API (ex. agenda .ics) sous le nom donné.
 * Le fichier est obtenu par HttpClient (donc avec le jeton d'authentification), puis
 * transmis au navigateur via une URL temporaire : sur téléphone, l'ouvrir propose de
 * l'ajouter à l'application d'agenda.
 */
export function saveFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Laisse au navigateur le temps de démarrer le téléchargement avant de libérer l'URL.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
