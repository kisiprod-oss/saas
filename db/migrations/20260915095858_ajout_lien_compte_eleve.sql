-- Relie facultativement un dossier élève à un compte de connexion.
-- Facultatif volontairement : pour les jeunes enfants, l'accès passe par le
-- parent et l'élève n'a pas de compte. La contrainte d'unicité est partielle
-- pour autoriser autant de dossiers sans compte que nécessaire.

alter table eleves
  add column utilisateur_id uuid references auth.users(id);

create unique index eleves_utilisateur_id_unique
  on eleves (utilisateur_id)
  where utilisateur_id is not null;
