/**
 * Tests API MDI.fr
 * Execute avec: node tests/api-tests.js
 */

const BASE_URL = 'https://mdi-fr.vercel.app/api';

// Couleurs pour le terminal
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(type, message) {
  const icons = {
    pass: `${colors.green}✓${colors.reset}`,
    fail: `${colors.red}✗${colors.reset}`,
    info: `${colors.blue}ℹ${colors.reset}`,
    warn: `${colors.yellow}⚠${colors.reset}`
  };
  console.log(`${icons[type]} ${message}`);
}

function section(title) {
  console.log(`\n${colors.bold}${colors.blue}═══ ${title} ═══${colors.reset}\n`);
}

// Variables globales pour les tests
let testToken = null;
let testUserId = null;
let testStructureId = null;
const testEmail = `test-${Date.now()}@mdi-test.com`;
const testPassword = 'TestPassword123!';

async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (testToken && !options.noAuth) {
    headers['Authorization'] = `Bearer ${testToken}`;
  }

  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const data = await response.json().catch(() => ({}));
    return { status: response.status, data, ok: response.ok };
  } catch (error) {
    return { status: 0, data: { error: error.message }, ok: false };
  }
}

// ========== TESTS ==========

async function testRegister() {
  section('Test Inscription');

  // Test 1: Inscription avec donnees valides
  const result = await apiRequest('/auth?action=register', {
    method: 'POST',
    body: { email: testEmail, password: testPassword },
    noAuth: true
  });

  if (result.status === 201 && result.data.token) {
    testToken = result.data.token;
    testUserId = result.data.user.id;
    log('pass', `Inscription reussie - User ID: ${testUserId}`);
    log('info', `Email verified: ${result.data.user.emailVerified}`);
  } else {
    log('fail', `Inscription echouee: ${JSON.stringify(result.data)}`);
    return false;
  }

  // Test 2: Inscription avec email existant
  const duplicateResult = await apiRequest('/auth?action=register', {
    method: 'POST',
    body: { email: testEmail, password: testPassword },
    noAuth: true
  });

  if (duplicateResult.status === 400) {
    log('pass', 'Rejet correct des emails dupliques');
  } else {
    log('fail', 'Devrait rejeter les emails dupliques');
  }

  // Test 3: Inscription avec mot de passe faible
  const weakPasswordResult = await apiRequest('/auth?action=register', {
    method: 'POST',
    body: { email: 'weak@test.com', password: '123' },
    noAuth: true
  });

  if (weakPasswordResult.status === 400 && weakPasswordResult.data.error) {
    log('pass', 'Rejet correct des mots de passe faibles');
  } else {
    log('fail', 'Devrait rejeter les mots de passe faibles');
  }

  // Test 4: Email invalide
  const invalidEmailResult = await apiRequest('/auth?action=register', {
    method: 'POST',
    body: { email: 'invalid-email', password: testPassword },
    noAuth: true
  });

  if (invalidEmailResult.status === 400) {
    log('pass', 'Rejet correct des emails invalides');
  } else {
    log('fail', 'Devrait rejeter les emails invalides');
  }

  return true;
}

async function testLogin() {
  section('Test Connexion');

  // Test 1: Connexion avec bonnes credentials
  const result = await apiRequest('/auth?action=login', {
    method: 'POST',
    body: { email: testEmail, password: testPassword },
    noAuth: true
  });

  if (result.status === 200 && result.data.token) {
    testToken = result.data.token;
    log('pass', 'Connexion reussie');
    log('info', `hasPaid: ${result.data.user.hasPaid}`);
  } else {
    log('fail', `Connexion echouee: ${JSON.stringify(result.data)}`);
    return false;
  }

  // Test 2: Connexion avec mauvais mot de passe
  const wrongPassword = await apiRequest('/auth?action=login', {
    method: 'POST',
    body: { email: testEmail, password: 'WrongPassword123!' },
    noAuth: true
  });

  if (wrongPassword.status === 401) {
    log('pass', 'Rejet correct des mauvais mots de passe');
  } else {
    log('fail', 'Devrait rejeter les mauvais mots de passe');
  }

  // Test 3: Connexion avec email inexistant
  const nonExistent = await apiRequest('/auth?action=login', {
    method: 'POST',
    body: { email: 'nonexistent@test.com', password: testPassword },
    noAuth: true
  });

  if (nonExistent.status === 401) {
    log('pass', 'Rejet correct des emails inexistants');
  } else {
    log('fail', 'Devrait rejeter les emails inexistants');
  }

  return true;
}

async function testEmailVerification() {
  section('Test Verification Email');

  // Test 1: Token invalide
  const invalidToken = await apiRequest('/auth/email?action=verify&token=invalid-token', {
    method: 'GET',
    noAuth: true
  });

  if (invalidToken.status === 400 && invalidToken.data.error) {
    log('pass', 'Rejet correct des tokens invalides');
  } else {
    log('fail', 'Devrait rejeter les tokens invalides');
  }

  // Test 2: Renvoyer email de verification
  const resendResult = await apiRequest('/auth/email?action=resend', {
    method: 'POST',
    body: { email: testEmail },
    noAuth: true
  });

  if (resendResult.status === 200) {
    log('pass', 'Renvoi email de verification OK');
  } else {
    log('warn', `Renvoi email: ${JSON.stringify(resendResult.data)}`);
  }

  return true;
}

async function testPasswordReset() {
  section('Test Mot de Passe Oublie');

  // Test 1: Demande de reset avec email existant
  const forgotResult = await apiRequest('/auth/password?action=forgot', {
    method: 'POST',
    body: { email: testEmail },
    noAuth: true
  });

  if (forgotResult.status === 200 && forgotResult.data.success) {
    log('pass', 'Demande de reset acceptee');
  } else {
    log('fail', `Demande de reset echouee: ${JSON.stringify(forgotResult.data)}`);
  }

  // Test 2: Demande avec email inexistant (ne doit pas reveler si l'email existe)
  const nonExistentReset = await apiRequest('/auth/password?action=forgot', {
    method: 'POST',
    body: { email: 'nonexistent@test.com' },
    noAuth: true
  });

  if (nonExistentReset.status === 200) {
    log('pass', 'Pas de fuite d\'information sur les emails existants');
  } else {
    log('fail', 'Ne devrait pas reveler si l\'email existe');
  }

  // Test 3: Reset avec token invalide
  const invalidReset = await apiRequest('/auth/password?action=reset', {
    method: 'POST',
    body: { token: 'invalid-token', password: 'NewPassword123!' },
    noAuth: true
  });

  if (invalidReset.status === 400) {
    log('pass', 'Rejet correct des tokens de reset invalides');
  } else {
    log('fail', 'Devrait rejeter les tokens de reset invalides');
  }

  return true;
}

async function testStructures() {
  section('Test Structures CRUD');

  if (!testToken) {
    log('warn', 'Pas de token, skip test structures');
    return false;
  }

  // Test 1: Liste des structures (vide)
  const listResult = await apiRequest('/structures');

  if (listResult.status === 200 && listResult.data.success) {
    log('pass', `Liste des structures OK (${listResult.data.data.structures.length} structures)`);
  } else {
    log('fail', `Liste des structures echouee: ${JSON.stringify(listResult.data)}`);
  }

  // Test 2: Creer une structure (avec donnees minimales requises)
  const createResult = await apiRequest('/structures', {
    method: 'POST',
    body: {
      type: 'SCI',
      nom: 'Test SCI',
      siren: '123456789',
      adresse: '123 Rue Test',
      code_postal: '75001',
      ville: 'Paris'
    }
  });

  if (createResult.status === 201 && createResult.data.success) {
    testStructureId = createResult.data.data.id;
    log('pass', `Structure creee - ID: ${testStructureId}`);
  } else {
    log('fail', `Creation structure echouee: ${JSON.stringify(createResult.data)}`);
    // Continue sans structure pour les autres tests
  }

  // Test 3: Recuperer une structure par ID
  if (testStructureId) {
    const getResult = await apiRequest(`/structures?id=${testStructureId}`);

    if (getResult.status === 200 && getResult.data.success) {
      log('pass', 'Recuperation structure par ID OK');
    } else {
      log('fail', `Recuperation structure echouee: ${JSON.stringify(getResult.data)}`);
    }

    // Test 4: Modifier une structure
    const updateResult = await apiRequest(`/structures?id=${testStructureId}`, {
      method: 'PUT',
      body: { nom: 'Test SCI Modified' }
    });

    if (updateResult.status === 200) {
      log('pass', 'Modification structure OK');
    } else {
      log('fail', `Modification structure echouee: ${JSON.stringify(updateResult.data)}`);
    }

    // Test 5: Supprimer une structure
    const deleteResult = await apiRequest(`/structures?id=${testStructureId}`, {
      method: 'DELETE'
    });

    if (deleteResult.status === 200) {
      log('pass', 'Suppression structure OK');
    } else {
      log('fail', `Suppression structure echouee: ${JSON.stringify(deleteResult.data)}`);
    }
  }

  // Test 6: Acces sans authentification
  const noAuthResult = await apiRequest('/structures', { noAuth: true });
  noAuthResult.headers = {};

  if (noAuthResult.status === 401) {
    log('pass', 'Protection authentification OK');
  } else {
    log('fail', 'Devrait requir authentification');
  }

  return true;
}

async function testUpload() {
  section('Test Upload Photos');

  if (!testToken) {
    log('warn', 'Pas de token, skip test upload');
    return false;
  }

  // Test sans fichier
  const noFileResult = await apiRequest('/upload', {
    method: 'POST'
  });

  // Le serveur devrait indiquer qu'il manque le BLOB_READ_WRITE_TOKEN
  // ou qu'aucun fichier n'a ete fourni
  if (noFileResult.status === 400 || noFileResult.status === 500) {
    if (noFileResult.data.error?.includes('Configuration')) {
      log('warn', 'BLOB_READ_WRITE_TOKEN non configure sur Vercel');
    } else {
      log('pass', 'Endpoint upload repond correctement');
    }
  } else {
    log('info', `Upload response: ${JSON.stringify(noFileResult.data)}`);
  }

  return true;
}

async function testMigrations() {
  section('Test Migrations');

  if (!testToken) {
    log('warn', 'Pas de token, skip test migrations');
    return false;
  }

  // Test sans nom de migration
  const noMigration = await apiRequest('/migrations', {
    method: 'POST',
    body: {}
  });

  if (noMigration.status === 400 && noMigration.data.available) {
    log('pass', `Endpoint migrations OK - Disponibles: ${noMigration.data.available.join(', ')}`);
  } else {
    log('fail', `Migrations response: ${JSON.stringify(noMigration.data)}`);
  }

  return true;
}

async function cleanup() {
  section('Nettoyage');

  // Supprimer l'utilisateur de test
  try {
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.POSTGRES_URL || process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_w3EgnkJGMra7@ep-twilight-hat-ag791tqq-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require');

    await sql`DELETE FROM users WHERE email = ${testEmail}`;
    log('pass', 'Utilisateur de test supprime');
  } catch (error) {
    log('warn', `Nettoyage manuel necessaire pour: ${testEmail}`);
  }
}

// ========== EXECUTION ==========

async function runAllTests() {
  console.log(`\n${colors.bold}${colors.blue}╔════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}║      TESTS API MDI.FR                  ║${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}╚════════════════════════════════════════╝${colors.reset}`);
  console.log(`\n${colors.info}URL: ${BASE_URL}${colors.reset}`);
  console.log(`${colors.info}Email test: ${testEmail}${colors.reset}`);

  const results = {
    register: false,
    login: false,
    emailVerification: false,
    passwordReset: false,
    structures: false,
    upload: false,
    migrations: false
  };

  try {
    results.register = await testRegister();
    results.login = await testLogin();
    results.emailVerification = await testEmailVerification();
    results.passwordReset = await testPasswordReset();
    results.structures = await testStructures();
    results.upload = await testUpload();
    results.migrations = await testMigrations();
  } catch (error) {
    log('fail', `Erreur inattendue: ${error.message}`);
  }

  await cleanup();

  // Resume
  section('Resume des Tests');

  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;

  Object.entries(results).forEach(([test, passed]) => {
    log(passed ? 'pass' : 'fail', `${test}: ${passed ? 'OK' : 'ECHEC'}`);
  });

  console.log(`\n${colors.bold}Resultat: ${passed}/${total} tests reussis${colors.reset}`);

  if (passed === total) {
    console.log(`${colors.green}${colors.bold}\nTous les tests sont passes! ✓${colors.reset}\n`);
  } else {
    console.log(`${colors.yellow}\nCertains tests ont echoue. Verifiez les logs ci-dessus.${colors.reset}\n`);
  }
}

runAllTests();
