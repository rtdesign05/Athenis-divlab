-- Ajout du flag stock_tracking sur les articles.
-- true = stock suivi (marchandise tenue en inventaire — vente limitée au stock disponible).
-- false = stock non suivi (service, prestation, abonnement — vente illimitée).
--
-- Migration non destructive : tous les articles existants conservent leur état
-- (stock_actuel, stock_min, lots, mouvements). On ne fait qu'ajouter une colonne
-- avec un défaut sécuritaire (true) puis on bascule les "Service" à false en
-- détectant le nom de famille (heuristique non destructive — réversible via UI).

ALTER TABLE "articles"
  ADD COLUMN "stock_tracking" BOOLEAN NOT NULL DEFAULT true;

-- Bascule les articles dont la famille s'appelle « Service » (ou variante) en
-- stock_tracking=false. Ne touche pas aux quantités ni aux mouvements existants.
UPDATE "articles" a
SET    "stock_tracking" = false
FROM   "stock_families" f
WHERE  a."famille_id" = f."id"
  AND  LOWER(f."nom") LIKE '%service%';
