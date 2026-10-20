import { ApiError } from '../middleware/errors.js';
export function object(body, allowed, required=[]) {
  if(!body || typeof body!=='object' || Array.isArray(body) || Object.keys(body).some(k=>!allowed.includes(k)) || required.some(k=>!Object.hasOwn(body,k)))throw new ApiError(400,'Invalid request fields');
  return body;
}
export function text(value, label, max=4000) {
  if(typeof value!=='string'||!value.trim()||value.length>max)throw new ApiError(400,`Invalid ${label}`);
  return value.trim();
}
export function choice(value, allowed, label) { if(!allowed.includes(value))throw new ApiError(400,`Invalid ${label}`);return value; }
export function transaction(db, operation) { db.exec('BEGIN IMMEDIATE');try{const value=operation();db.exec('COMMIT');return value;}catch(error){db.exec('ROLLBACK');throw error;} }
