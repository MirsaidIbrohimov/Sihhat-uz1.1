"use client";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Battery,
  Building2,
  Calendar,
  Compass,
  ExternalLink,
  Home,
  Megaphone,
  Search,
  Signal,
  Sparkles,
  User,
  Wifi,
} from "lucide-react";
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

  const targetName =
    campaign?.data?.target_kind === "URL"
      ? "Havolani ochadi"
      : (ctx.tenants.find(
          (tenant) =>
            tenant.id ===
            (campaign?.data?.target_sanatorium_id ?? campaign?.sanatoriumId),
        )?.name ?? "Sanatoriya sahifasi");

  return (
    <div className="ad-placement-preview">
      <div className="preview-heading">
        <div className="preview-heading-icon">
          <Megaphone size={16} />
        </div>
        <div>
          <h3>Ilovadagi ko‘rinish</h3>
          <p className="preview-heading-sub">
            {campaign
              ? `Tanlangan: ${campaign.title}`
              : "Reklama tanlanmagan"}
          </p>
        </div>
      </div>

      {/* Modern Smartphone Mockup */}
      <div className="mockup-phone">
        {/* Dynamic Island / Speaker notch */}
        <div className="mockup-island">
          <span className="mockup-camera-lens" />
        </div>

        {/* Status Bar */}
        <div className="mockup-status-bar">
          <span className="mockup-time">09:41</span>
          <div className="mockup-status-icons">
            <Signal size={12} strokeWidth={2.5} />
            <Wifi size={12} strokeWidth={2.5} />
            <Battery size={13} strokeWidth={2.5} />
          </div>
        </div>

        {/* Phone Screen Content */}
        <div className="mockup-screen-body">
          {/* Top Brand Bar */}
          <div className="mockup-app-bar">
            <div className="mockup-brand">
              <img
                src="/branding/sihhat-logo.jpg"
                alt="Sihhat uz"
                width={26}
                height={26}
                className="mockup-logo"
              />
              <span className="mockup-brand-title">sihhat.uz</span>
            </div>
            <div className="mockup-notification-dot" />
          </div>

          {/* Search Field */}
          <div className="mockup-search">
            <Search size={13} className="mockup-search-icon" />
            <span>Sanatoriya yoki xizmat qidirish...</span>
          </div>

          {/* Placement Notice */}
          <div className="mockup-section-header">
            <span>
              {campaign?.placement === "POPUP"
                ? "KIRISH REKLAMASI"
                : "BOSH SAHIFA TAKLIFI"}
            </span>
            <span className="mockup-badge-live">Jonli</span>
          </div>

          {/* Campaign or Featured Cards */}
          {campaign ? (
            <div
              className={`mockup-ad-card ${campaign.placement === "POPUP" ? "popup-preview" : ""}`}
            >
              {/* Image banner */}
              <div className="mockup-card-image-wrap">
                {asset && !missing ? (
                  <img
                    src={`/api/media/${asset}`}
                    alt="Reklama rasmi"
                    className="mockup-card-image"
                    onError={() => setMissing(true)}
                  />
                ) : (
                  <div className="mockup-image-empty">
                    <Megaphone size={26} />
                    <span>
                      {missing
                        ? "Rasmni yuklab bo‘lmadi"
                        : "Reklama rasmi qo‘shilmagan"}
                    </span>
                  </div>
                )}
                {/* Discount Badge on Image */}
                {campaign.data?.has_discount && (
                  <div className="mockup-discount-badge">
                    {campaign.data.discount_percent
                      ? `${campaign.data.discount_percent}% CHEGIRMA`
                      : (campaign.data.discount_text || "CHEGIRMA")}
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div className="mockup-card-content">
                <div className="mockup-card-tags">
                  <span className="mockup-tag-ad">REKLAMA</span>
                  {campaign.placement === "POPUP" && (
                    <span className="mockup-tag-sub">Maxsus oyna</span>
                  )}
                </div>

                <h4 className="mockup-card-title">{campaign.title}</h4>

                {campaign.data?.text && (
                  <p className="mockup-card-desc">{campaign.data.text}</p>
                )}

                {/* Target Footer */}
                <div className="mockup-card-footer">
                  <div className="mockup-target-info">
                    {campaign.data?.target_kind === "URL" ? (
                      <>
                        <ExternalLink size={12} />
                        <span>Havolani ochadi</span>
                      </>
                    ) : (
                      <>
                        <Building2 size={12} />
                        <span className="mockup-target-name">{targetName}</span>
                      </>
                    )}
                  </div>
                  <div className="mockup-card-btn">
                    <span>Ko‘rish</span>
                    <ArrowRight size={11} />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mockup-featured-list">
              <div className="mockup-featured-heading">
                <Building2 size={13} />
                <span>Mashhur sanatoriyalar</span>
              </div>
              {featured.length ? (
                featured.slice(0, 3).map((tenant) => (
                  <div key={tenant.id} className="mockup-featured-item">
                    <div className="mockup-featured-icon">
                      <Building2 size={14} />
                    </div>
                    <div className="mockup-featured-info">
                      <strong>{tenant.name}</strong>
                      <span className="muted">Ommabop maskan</span>
                    </div>
                    <ArrowRight size={13} className="muted" />
                  </div>
                ))
              ) : (
                <div className="mockup-empty-notice">
                  Mashhur sanatoriyalar topilmadi
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom App Navigation */}
        <div className="mockup-bottom-nav">
          <div className="mockup-nav-item active">
            <Home size={15} />
            <span>Asosiy</span>
          </div>
          <div className="mockup-nav-item">
            <Compass size={15} />
            <span>Katalog</span>
          </div>
          <div className="mockup-nav-item">
            <Calendar size={15} />
            <span>Bronlar</span>
          </div>
          <div className="mockup-nav-item">
            <Sparkles size={15} />
            <span>AI</span>
          </div>
          <div className="mockup-nav-item">
            <User size={15} />
            <span>Profil</span>
          </div>
        </div>

        {/* Home Indicator Bar */}
        <div className="mockup-home-bar" />
      </div>

      {campaign && (
        <div className="preview-campaign-status">
          <Badge value={campaign.status} />
          <span>
            {campaign.publication_status === "LIVE"
              ? "Ilovada faol ko‘rsatilmoqda"
              : "Bu oldindan ko‘rish (chiqish holati kampaniya statusiga bog‘liq)."}
          </span>
        </div>
      )}
      <p className="preview-explanation">
        Bosh sahifada faol reklama mashhur sanatoriyalar o‘rnida foydalanuvchilar e'tiborini tortadigan jozibador kartochka shaklida chiqadi.
      </p>
    </div>
  );
}
