-- V14__rename_hold_id_to_group_id.sql

ALTER TABLE reservations RENAME COLUMN hold_id TO group_id;
