"use client";
import { useEffect, useState } from "react";
import { Building2, Megaphone, Search } from "lucide-react";
import { Badge, type Row, usePortal } from "./components";

export function AdPlacementPreview({ campaign }: { campaign?: Row }) {
  const ctx = usePortal();
  const asset = campaign?.data?.image_asset_id;
  const [missing, setMissing] = useState(false);
  useEffect(() => setMissing(false), [asset]);
  const featured = ctx.tenants.filter(
    (tenant) =>
      tenant.featuredOnHome &&
      tenant.status === "ACTIVE" &&
      tenant.publicRevisionId,
  );
  return (
    <div className="ad-placement-preview">
      <div className="preview-heading">
        <Megaphone size={19} />
        <h3>Ilovadagi ko‘rinish</h3>
      </div>
      <p className="muted">
        {campaign
          ? `Tanlangan reklama: ${campaign.title}`
          : "Reklama tanlanmagan"}
      </p>
      <div className="phone-preview">
        <div className="phone-preview-brand">
          <img
            src="/branding/sihhat-logo.jpg"
            alt="Sihhat uz"
            width={34}
            height={34}
          />
          <strong>sihhat.uz</strong>
        </div>
        <div className="preview-search">
          <Search size={15} />
          <span>Sanatoriya qidirish</span>
        </div>
        {campaign ? (
          <div
            className={`preview-ad ${campaign.placement === "POPUP" ? "popup-preview" : ""}`}
          >
            <span className="preview-placement">
              {campaign.placement === "POPUP"
                ? "Kirishdagi reklama"
                : "Bosh sahifadagi reklama"}
            </span>
            {asset && !missing ? (
              <img
                src={`/api/media/${asset}`}
                alt="Reklama rasmi"
                onError={() => setMissing(true)}
              />
            ) : (
              <div className="preview-image-empty">
                <Megaphone size={30} />
                <span>
                  {missing
                    ? "Rasmni yuklab bo‘lmadi"
                    : "Reklama rasmi qo‘shilmagan"}
                </span>
              </div>
            )}
            <div className="preview-ad-copy">
              <strong>{campaign.title}</strong>
              <p>{campaign.data?.text}</p>
              {campaign.data?.has_discount && (
                <span className="ad-discount">
                  {campaign.data.discount_percent
                    ? `${campaign.data.discount_percent}%`
                    : campaign.data.discount_text}
                </span>
              )}
              <span className="preview-target">
                {campaign.data?.target_kind === "URL"
                  ? "Havolani ochadi"
                  : (ctx.tenants.find(
                      (tenant) =>
                        tenant.id ===
                        (campaign.data?.target_sanatorium_id ??
                          campaign.sanatoriumId),
                    )?.name ?? "Sanatoriyani ochadi")}
              </span>
            </div>
          </div>
        ) : (
          <div className="preview-featured">
            <h3>Mashhur sanatoriyalar</h3>
            {featured.length ? (
              featured.slice(0, 3).map((tenant) => (
                <div key={tenant.id}>
                  <Building2 size={18} />
                  <strong>{tenant.name}</strong>
                </div>
              ))
            ) : (
              <p className="muted">Mashhur sanatoriyalar tanlanmagan.</p>
            )}
          </div>
        )}
      </div>
      {campaign && (
        <div className="preview-campaign-status">
          <Badge value={campaign.status} />
          <span>
            {campaign.publication_status === "LIVE"
              ? "Ilovada chiqmoqda"
              : "Bu oldindan ko‘rish; chiqish holati kampaniyada ko‘rsatilgan."}
          </span>
        </div>
      )}
      <p className="preview-explanation">
        Bosh sahifada faol reklama mashhur sanatoriyalar o‘rnida chiqadi.
        Reklama bo‘lmasa, superadmin belgilagan sanatoriyalar ko‘rinadi.
      </p>
    </div>
  );
}
