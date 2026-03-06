import React, { useState } from 'react';
import { TypeStructure, CreateStructureForm } from '@/types';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface StructureFormProps {
  onSubmit: (data: CreateStructureForm) => void;
  onCancel?: () => void;
}

const StructureForm: React.FC<StructureFormProps> = ({ onSubmit, onCancel }) => {
  const [type, setType] = useState<TypeStructure>('PERSONNE_PHYSIQUE');
  const [formData, setFormData] = useState<CreateStructureForm>({
    type: 'PERSONNE_PHYSIQUE',
    nom: '',
    adresse: '',
    telephone: '',
    email: ''
  });

  const [personnePhysique, setPersonnePhysique] = useState({
    prenom: '',
    dateNaissance: '',
    lieuNaissance: '',
    nationalite: 'Française',
    situationFamiliale: 'Celibataire' as const,
    statutProfessionnel: 'Salarie' as const,
    emploi: '',
    employeur: '',
    typeContrat: 'CDI' as const,
    anciennete: '',
    revenus: {
      salaireMensuelNet: 0,
      primesAnnuelles: 0,
      revenusLocatifs: 0,
      autresRevenus: 0
    },
    charges: {
      loyerMensuel: 0,
      mensualitesCredits: 0,
      pensionAlimentaire: 0,
      autresCharges: 0
    }
  });

  const [personneMorale, setPersonneMorale] = useState({
    denominationSociale: '',
    siret: '',
    siren: '',
    formeJuridique: 'SCI' as const,
    dateCreation: '',
    capitalSocial: 0,
    chiffreAffairesAnnuel: 0,
    resultatNet: 0,
    banquePrincipale: '',
    representantLegal: {
      nom: '',
      prenom: '',
      fonction: 'Gerant' as const,
      dateNaissance: ''
    }
  });

  const handleTypeChange = (newType: TypeStructure) => {
    setType(newType);
    setFormData({ ...formData, type: newType });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data: CreateStructureForm = {
      ...formData,
      type
    };

    if (type === 'PERSONNE_PHYSIQUE') {
      data.personnePhysique = {
        ...personnePhysique,
        dateNaissance: new Date(personnePhysique.dateNaissance)
      };
    } else {
      data.personneMorale = {
        ...personneMorale,
        dateCreation: new Date(personneMorale.dateCreation),
        representantLegal: {
          ...personneMorale.representantLegal,
          dateNaissance: new Date(personneMorale.representantLegal.dateNaissance)
        }
      };
    }

    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Créer une nouvelle structure
        </h2>

        {/* Sélection du type */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Type de structure
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(['PERSONNE_PHYSIQUE', 'SCI', 'SARL', 'SASU', 'EURL', 'SAS', 'SA', 'HOLDING'] as TypeStructure[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleTypeChange(t)}
                className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                  type === t
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Informations communes */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-900">
            Informations générales
          </h3>

          <Input
            label={type === 'PERSONNE_PHYSIQUE' ? 'Nom complet' : 'Dénomination sociale'}
            value={formData.nom}
            onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
            required
          />

          <Input
            label="Adresse"
            value={formData.adresse}
            onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Téléphone"
              type="tel"
              value={formData.telephone}
              onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
            />

            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
        </div>
      </Card>

      {/* Formulaire spécifique Personne Physique */}
      {type === 'PERSONNE_PHYSIQUE' && (
        <Card>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Informations personnelles
          </h3>

          <div className="space-y-4">
            <Input
              label="Prénom"
              value={personnePhysique.prenom}
              onChange={(e) => setPersonnePhysique({ ...personnePhysique, prenom: e.target.value })}
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Date de naissance"
                type="date"
                value={personnePhysique.dateNaissance}
                onChange={(e) => setPersonnePhysique({ ...personnePhysique, dateNaissance: e.target.value })}
                required
              />

              <Input
                label="Lieu de naissance"
                value={personnePhysique.lieuNaissance}
                onChange={(e) => setPersonnePhysique({ ...personnePhysique, lieuNaissance: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Situation familiale
                </label>
                <select
                  value={personnePhysique.situationFamiliale}
                  onChange={(e) => setPersonnePhysique({ ...personnePhysique, situationFamiliale: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900/10"
                >
                  <option value="Celibataire">Célibataire</option>
                  <option value="Marie">Marié(e)</option>
                  <option value="Pacse">Pacsé(e)</option>
                  <option value="Divorce">Divorcé(e)</option>
                  <option value="Veuf">Veuf(ve)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Statut professionnel
                </label>
                <select
                  value={personnePhysique.statutProfessionnel}
                  onChange={(e) => setPersonnePhysique({ ...personnePhysique, statutProfessionnel: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900/10"
                >
                  <option value="Salarie">Salarié</option>
                  <option value="Independant">Indépendant</option>
                  <option value="Dirigeant">Dirigeant</option>
                  <option value="Retraite">Retraité</option>
                  <option value="Sans_activite">Sans activité</option>
                </select>
              </div>
            </div>

            {personnePhysique.statutProfessionnel === 'Salarie' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Emploi"
                  value={personnePhysique.emploi}
                  onChange={(e) => setPersonnePhysique({ ...personnePhysique, emploi: e.target.value })}
                />

                <Input
                  label="Employeur"
                  value={personnePhysique.employeur}
                  onChange={(e) => setPersonnePhysique({ ...personnePhysique, employeur: e.target.value })}
                />
              </div>
            )}

            <h4 className="text-md font-semibold text-gray-900 mt-6">Revenus mensuels</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Salaire net mensuel"
                type="number"
                value={personnePhysique.revenus.salaireMensuelNet}
                onChange={(e) => setPersonnePhysique({
                  ...personnePhysique,
                  revenus: { ...personnePhysique.revenus, salaireMensuelNet: Number(e.target.value) }
                })}
              />

              <Input
                label="Primes annuelles"
                type="number"
                value={personnePhysique.revenus.primesAnnuelles}
                onChange={(e) => setPersonnePhysique({
                  ...personnePhysique,
                  revenus: { ...personnePhysique.revenus, primesAnnuelles: Number(e.target.value) }
                })}
              />
            </div>

            <h4 className="text-md font-semibold text-gray-900 mt-6">Charges mensuelles</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Loyer mensuel"
                type="number"
                value={personnePhysique.charges.loyerMensuel}
                onChange={(e) => setPersonnePhysique({
                  ...personnePhysique,
                  charges: { ...personnePhysique.charges, loyerMensuel: Number(e.target.value) }
                })}
              />

              <Input
                label="Mensualités crédits"
                type="number"
                value={personnePhysique.charges.mensualitesCredits}
                onChange={(e) => setPersonnePhysique({
                  ...personnePhysique,
                  charges: { ...personnePhysique.charges, mensualitesCredits: Number(e.target.value) }
                })}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Formulaire spécifique Personne Morale */}
      {type !== 'PERSONNE_PHYSIQUE' && (
        <Card>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Informations société
          </h3>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="SIRET"
                value={personneMorale.siret}
                onChange={(e) => setPersonneMorale({ ...personneMorale, siret: e.target.value })}
                required
                maxLength={14}
              />

              <Input
                label="SIREN"
                value={personneMorale.siren}
                onChange={(e) => setPersonneMorale({ ...personneMorale, siren: e.target.value })}
                required
                maxLength={9}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Date de création"
                type="date"
                value={personneMorale.dateCreation}
                onChange={(e) => setPersonneMorale({ ...personneMorale, dateCreation: e.target.value })}
                required
              />

              <Input
                label="Capital social (€)"
                type="number"
                value={personneMorale.capitalSocial}
                onChange={(e) => setPersonneMorale({ ...personneMorale, capitalSocial: Number(e.target.value) })}
                required
              />
            </div>

            <h4 className="text-md font-semibold text-gray-900 mt-6">Représentant légal</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nom"
                value={personneMorale.representantLegal.nom}
                onChange={(e) => setPersonneMorale({
                  ...personneMorale,
                  representantLegal: { ...personneMorale.representantLegal, nom: e.target.value }
                })}
                required
              />

              <Input
                label="Prénom"
                value={personneMorale.representantLegal.prenom}
                onChange={(e) => setPersonneMorale({
                  ...personneMorale,
                  representantLegal: { ...personneMorale.representantLegal, prenom: e.target.value }
                })}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fonction
                </label>
                <select
                  value={personneMorale.representantLegal.fonction}
                  onChange={(e) => setPersonneMorale({
                    ...personneMorale,
                    representantLegal: { ...personneMorale.representantLegal, fonction: e.target.value as any }
                  })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900/10"
                >
                  <option value="Gerant">Gérant</option>
                  <option value="President">Président</option>
                  <option value="Directeur_General">Directeur Général</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>

              <Input
                label="Date de naissance"
                type="date"
                value={personneMorale.representantLegal.dateNaissance}
                onChange={(e) => setPersonneMorale({
                  ...personneMorale,
                  representantLegal: { ...personneMorale.representantLegal, dateNaissance: e.target.value }
                })}
                required
              />
            </div>
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-4">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} type="button">
            Annuler
          </Button>
        )}
        <Button type="submit">
          Créer la structure
        </Button>
      </div>
    </form>
  );
};

export default StructureForm;
