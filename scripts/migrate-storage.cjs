const https = require('https');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const OLD_SUPABASE_URL = 'https://etslsnlmexokwvrneomd.supabase.co';
const OLD_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0c2xzbmxtZXhva3d2cm5lb21kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMTg1MzgsImV4cCI6MjA4MTg5NDUzOH0.KffktxSF9yAYdPix8Otu7yFyL3Wbr7LaJorlHmsN7Cw';
const NEW_SUPABASE_URL = 'https://hyoudezyqbivfthcgpma.supabase.co';
const NEW_SERVICE_ROLE_KEY = process.env.NEW_SUPABASE_SERVICE_ROLE_KEY;

if (!NEW_SERVICE_ROLE_KEY) {
  console.error('Erreur: NEW_SUPABASE_SERVICE_ROLE_KEY non définie');
  process.exit(1);
}

const oldSupabase = createClient(OLD_SUPABASE_URL, OLD_ANON_KEY);
const newSupabase = createClient(NEW_SUPABASE_URL, NEW_SERVICE_ROLE_KEY);

function downloadFile(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        downloadFile(res.headers.location).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// Migrer tous les fichiers d'un bucket
async function migrateBucket(bucketName) {
  console.log(`\n--- Migration bucket: ${bucketName} ---`);
  
  const { data: folders, error } = await oldSupabase.storage.from(bucketName).list('', { limit: 1000 });
  
  if (error) {
    console.error(`Erreur listing ${bucketName}:`, error.message);
    return;
  }

  for (const item of folders || []) {
    if (item.id === null) {
      // C'est un dossier, lister son contenu
      await migrateFolder(bucketName, item.name);
    } else {
      // C'est un fichier à la racine
      await migrateFile(bucketName, item.name);
    }
  }
}

async function migrateFolder(bucketName, folderPath) {
  const { data: files, error } = await oldSupabase.storage.from(bucketName).list(folderPath, { limit: 1000 });
  
  if (error) {
    console.error(`Erreur listing ${folderPath}:`, error.message);
    return;
  }

  for (const file of files || []) {
    if (file.id === null) {
      // Sous-dossier
      await migrateFolder(bucketName, `${folderPath}/${file.name}`);
    } else {
      await migrateFile(bucketName, `${folderPath}/${file.name}`);
    }
  }
}

async function migrateFile(bucketName, filePath) {
  const url = `${OLD_SUPABASE_URL}/storage/v1/object/public/${bucketName}/${filePath}`;
  
  try {
    console.log(`  ${filePath}`);
    const data = await downloadFile(url);
    
    const { error: uploadError } = await newSupabase.storage
      .from(bucketName)
      .upload(filePath, data, { upsert: true });
    
    if (uploadError) {
      console.error(`    Erreur upload: ${uploadError.message}`);
    } else {
      console.log(`    OK`);
    }
  } catch (e) {
    console.error(`    Erreur: ${e.message}`);
  }
}

async function main() {
  console.log('=== Migration complète Storage ===');
  
  // Migrer les deux buckets
  await migrateBucket('avatars');
  await migrateBucket('outings_gallery');
  
  console.log('\n=== Migration terminée ===');
}

main();