-- Add responsive sizing and layout configuration to embed_customizations
ALTER TABLE embed_customizations 
ADD COLUMN IF NOT EXISTS sizing_mode text DEFAULT 'responsive' CHECK (sizing_mode IN ('fixed', 'responsive', 'fullscreen', 'custom')),
ADD COLUMN IF NOT EXISTS mobile_width text DEFAULT '100%',
ADD COLUMN IF NOT EXISTS mobile_height text DEFAULT '100vh',
ADD COLUMN IF NOT EXISTS tablet_width text DEFAULT '400px',
ADD COLUMN IF NOT EXISTS tablet_height text DEFAULT '600px',
ADD COLUMN IF NOT EXISTS desktop_width text DEFAULT '450px',
ADD COLUMN IF NOT EXISTS desktop_height text DEFAULT '700px',
ADD COLUMN IF NOT EXISTS custom_width text DEFAULT '380px',
ADD COLUMN IF NOT EXISTS custom_height text DEFAULT '600px',
ADD COLUMN IF NOT EXISTS max_width text DEFAULT '100vw',
ADD COLUMN IF NOT EXISTS max_height text DEFAULT '100vh',
ADD COLUMN IF NOT EXISTS min_width text DEFAULT '300px',
ADD COLUMN IF NOT EXISTS min_height text DEFAULT '400px',
ADD COLUMN IF NOT EXISTS layout_mode text DEFAULT 'floating' CHECK (layout_mode IN ('floating', 'embedded', 'fullscreen', 'sidebar')),
ADD COLUMN IF NOT EXISTS enable_mobile_fullscreen boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS hide_header_on_mobile boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS compact_mode_threshold text DEFAULT '600px';

COMMENT ON COLUMN embed_customizations.sizing_mode IS 'Sizing mode: fixed, responsive, fullscreen, or custom';
COMMENT ON COLUMN embed_customizations.layout_mode IS 'Layout mode: floating (widget), embedded (inline), fullscreen, or sidebar';