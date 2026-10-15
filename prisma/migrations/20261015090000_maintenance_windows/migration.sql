CREATE TABLE "MaintenanceWindow" (
    "id" UUID NOT NULL,
    "resourceId" UUID NOT NULL,
    "startTime" TIMESTAMPTZ(6) NOT NULL,
    "endTime" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MaintenanceWindow_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MaintenanceWindow_end_after_start" CHECK ("endTime" > "startTime")
);

CREATE INDEX "MaintenanceWindow_resourceId_startTime_endTime_idx" ON "MaintenanceWindow"("resourceId", "startTime", "endTime");
ALTER TABLE "MaintenanceWindow" ADD CONSTRAINT "MaintenanceWindow_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
