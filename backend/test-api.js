// Script de test simple pour l'API MDI.fr
const API_BASE = 'http://localhost:3001/api';

async function testAPI() {
  console.log('🧪 Test de l\'API MDI.fr Backend\n');

  // Test 1: Health check
  console.log('1. Test du health check...');
  try {
    const healthResponse = await fetch(`${API_BASE.replace('/api', '')}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
  } catch (error) {
    console.log('❌ Health check échoué:', error.message);
  }

  // Test 2: Informations API
  console.log('\n2. Test des informations API...');
  try {
    const infoResponse = await fetch(`${API_BASE.replace('/api', '')}/`);
    const infoData = await infoResponse.json();
    console.log('✅ Informations API:', infoData);
  } catch (error) {
    console.log('❌ Informations API échoué:', error.message);
  }

  // Test 3: Inscription
  console.log('\n3. Test d\'inscription...');
  try {
    const registerResponse = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: `test-${Date.now()}@example.com`,
        password: 'password123'
      })
    });
    const registerData = await registerResponse.json();
    
    if (registerResponse.ok) {
      console.log('✅ Inscription réussie:', registerData.message);
      
      // Test 4: Connexion
      console.log('\n4. Test de connexion...');
      const loginResponse = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: `test-${Date.now()}@example.com`,
          password: 'password123'
        })
      });
      const loginData = await loginResponse.json();
      
      if (loginResponse.ok) {
        console.log('✅ Connexion réussie:', loginData.message);
        const token = loginData.data.token;
        
        // Test 5: Création d'un dossier
        console.log('\n5. Test de création de dossier...');
        const dossierResponse = await fetch(`${API_BASE}/dossiers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            nomSCI: 'SCI Test',
            localisation: 'Paris, France',
            prixAcquisition: 500000,
            montantTravaux: 50000
          })
        });
        const dossierData = await dossierResponse.json();
        
        if (dossierResponse.ok) {
          console.log('✅ Création de dossier réussie:', dossierData.message);
          
          // Test 6: Récupération des dossiers
          console.log('\n6. Test de récupération des dossiers...');
          const dossiersResponse = await fetch(`${API_BASE}/dossiers`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          const dossiersData = await dossiersResponse.json();
          
          if (dossiersResponse.ok) {
            console.log('✅ Récupération des dossiers réussie:', dossiersData.data.dossiers.length, 'dossiers');
          } else {
            console.log('❌ Récupération des dossiers échoué:', dossiersData.error);
          }
        } else {
          console.log('❌ Création de dossier échoué:', dossierData.error);
        }
      } else {
        console.log('❌ Connexion échoué:', loginData.error);
      }
    } else {
      console.log('❌ Inscription échoué:', registerData.error);
    }
  } catch (error) {
    console.log('❌ Test d\'inscription échoué:', error.message);
  }

  console.log('\n🎉 Tests terminés !');
}

// Exécuter les tests
testAPI().catch(console.error); 