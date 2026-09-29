/**
 * URL de l'API FastAPI (voir backend/SETUP_LOCAL.md) : même machine que la page, port 8000.
 * Sur le PC, la page est servie par localhost, donc l'API aussi ; depuis un téléphone du
 * même réseau (http://192.168.x.x:4200, voir « npm run start:lan »), l'API est jointe à la
 * même adresse au lieu du « localhost » du téléphone.
 */
export const API_URL = `${window.location.protocol}//${window.location.hostname}:8000`;
