CREATE INDEX "profile_geom_gist_idx" ON "profile" USING gist ("geom");--> statement-breakpoint
CREATE INDEX "profile_location_geom_gist_idx" ON "profile_location" USING gist ("geom");