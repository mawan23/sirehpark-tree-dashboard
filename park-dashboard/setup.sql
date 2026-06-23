-- ═══════════════════════════════════════════════════════════════════════════
-- Park CSR Tree Dashboard — Table Setup
-- Only run this if your sirehtree_db does NOT already have a 'trees' table.
-- Your existing data is already in the database — do NOT run the INSERTs
-- below if data already exists (it will duplicate rows).
-- ═══════════════════════════════════════════════════════════════════════════

-- Check if your table is already there first:
-- SELECT * FROM trees LIMIT 5;

-- If you need to create it fresh (matches your exact column names):
CREATE TABLE IF NOT EXISTS trees (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    Tree_No     INT NOT NULL,
    Input_Type  VARCHAR(50) NOT NULL DEFAULT 'RegisterTree',
    Tree_ID     VARCHAR(50) NOT NULL,
    Tree_Species VARCHAR(100) NOT NULL,
    Latitude    DECIMAL(10,7) NOT NULL,
    Longitude   DECIMAL(10,7) NOT NULL,
    Tree_Height DECIMAL(6,2) DEFAULT NULL COMMENT 'metres',
    DBH         DECIMAL(6,2) DEFAULT NULL COMMENT 'diameter breast height in cm',
    Tree_Status VARCHAR(50)  NOT NULL DEFAULT 'Alive',
    Date        DATETIME     DEFAULT NULL,
    Email       VARCHAR(255) DEFAULT NULL,
    Remarks     TEXT         DEFAULT NULL,
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_status  (Tree_Status),
    INDEX idx_species (Tree_Species),
    INDEX idx_date    (Date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Sample row (only if starting from scratch) ───────────────────────────────
-- INSERT INTO trees (Tree_No, Input_Type, Tree_ID, Tree_Species, Latitude, Longitude, Tree_Height, DBH, Tree_Status, Date, Email, Remarks)
-- VALUES (23020, 'RegisterTree', 'SIREHPARK01202', 'Bintagor Laut', 1.4654505, 103.6454533, 1, 0.5, 'Alive', '2022-07-10 15:27:00', 'sirehpark.iskandarputeri@gmail.com', 'Planted by MCIS Life');
