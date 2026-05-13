-- Ajout du flag is_centralizer sur AccountPlan
-- Permet à l'utilisateur de marquer explicitement quels comptes sont
-- des centralisateurs (regroupement de comptes ayant la même racine).
-- Par défaut FALSE : aucun compte n'est centralisateur tant que l'utilisateur
-- ne le déclare pas.

ALTER TABLE "account_plans"
  ADD COLUMN IF NOT EXISTS "is_centralizer" BOOLEAN NOT NULL DEFAULT false;
