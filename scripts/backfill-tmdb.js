#!/usr/bin/env node
/**
 * Backfill script: populate `posts.{postId}.movie.tmdbId` from `movieReviews` collection when possible.
 * Usage: set env var GOOGLE_APPLICATION_CREDENTIALS or pass --serviceAccount path.
 * Example: node scripts/backfill-tmdb.js --dry-run
 */
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

function parseArgs() {
  const args = process.argv.slice(2);
  const out: Record<string, string|boolean> = {};
  for (let i=0;i<args.length;i++){
    const a = args[i];
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--serviceAccount' && args[i+1]) { out.serviceAccount = args[++i]; }
  }
  return out;
}

async function main(){
  const opts = parseArgs();
  if (opts.serviceAccount) {
    const saPath = path.resolve(String(opts.serviceAccount));
    const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
    admin.initializeApp({ credential: admin.credential.cert(sa) });
  } else {
    admin.initializeApp();
  }

  const db = admin.firestore();

  console.log('Loading movieReviews mapping (feedPostId -> tmdbId)...');
  const mrSnap = await db.collection('movieReviews').get();
  const mapping = new Map();
  mrSnap.forEach((d)=>{
    const data = d.data();
    if (data.feedPostId && data.tmdbId) mapping.set(String(data.feedPostId), data.tmdbId);
  });
  console.log(`Found ${mapping.size} movieReviews with tmdbId`);

  console.log('Scanning posts collection in batches and applying backfill where possible...');
  const postsCol = db.collection('posts');
  const pageSize = 500;
  let last = null;
  let updated = 0;
  while (true) {
    let q = postsCol.orderBy('__name__').limit(pageSize);
    if (last) q = q.startAfter(last);
    const snap = await q.get();
    if (snap.empty) break;
    last = snap.docs[snap.docs.length-1];
    const batch = db.batch();
    let batchCount = 0;
    for (const doc of snap.docs) {
      const data = doc.data();
      const movie = data.movie;
      if (!movie) continue;
      if (movie.tmdbId) continue;
      const tmdb = mapping.get(doc.id);
      if (tmdb) {
        if (opts.dryRun) {
          console.log(`[DRY] Would set post ${doc.id}.movie.tmdbId = ${tmdb}`);
        } else {
          batch.update(doc.ref, { 'movie.tmdbId': tmdb });
          batchCount++;
        }
        updated++;
      }
    }
    if (!opts.dryRun && batchCount > 0) await batch.commit();
    if (snap.size < pageSize) break;
  }

  console.log(`Done. ${updated} posts matched movieReviews and were${opts.dryRun ? ' (dry-run)':''} scheduled/updated.`);
  process.exit(0);
}

main().catch((e)=>{ console.error(e); process.exit(1); });
