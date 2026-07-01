import { GalleryClient } from "@/components/gallery/GalleryClient";
import { getCurrentProfile, getMarbleTypes } from "@/lib/data";

export default async function GalleryPage() {
  const [items, { profile }] = await Promise.all([
    getMarbleTypes(),
    getCurrentProfile(),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-chrome-900">גלריית שיש</h2>
        <p className="text-sm text-muted">
          הצגה חזותית ומפוארת של כל סוגי השיש והאבן באולם התצוגה
        </p>
      </div>

      <GalleryClient items={items} role={profile?.role ?? "viewer"} />
    </div>
  );
}
