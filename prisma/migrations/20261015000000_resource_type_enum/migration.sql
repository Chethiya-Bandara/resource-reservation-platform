-- Replace unconstrained resource type text with the supported resource categories.
CREATE TYPE "ResourceType" AS ENUM ('MEETING_ROOM', 'CREATIVE_SPACE', 'EQUIPMENT');

ALTER TABLE "Resource"
ALTER COLUMN "type" TYPE "ResourceType"
USING (
  CASE "type"
    WHEN 'Meeting room' THEN 'MEETING_ROOM'::"ResourceType"
    WHEN 'Creative space' THEN 'CREATIVE_SPACE'::"ResourceType"
    WHEN 'Equipment' THEN 'EQUIPMENT'::"ResourceType"
    ELSE 'MEETING_ROOM'::"ResourceType"
  END
);
