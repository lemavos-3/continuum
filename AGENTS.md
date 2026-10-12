# Architecture rules
- Let Stripe Dashboard control Adaptive Pricing for hosted subscription Checkout; omit explicit currency and per-session overrides so Stripe localizes eligible sessions without SDK-version-dependent parameters.
- Share one email layout, button helper and token palette across account notifications and welcome emails so branding stays consistent without duplicated templates.
- Use SmoothDrawer for mobile Notes filters and opt-in Vaul snap points for graph details; reset the compact snap on reopening or changing the selected node to preserve drag-to-expand behavior.
- Reuse the mobile search input, FilterChips and ListSortMenu on desktop list pages; keep the desktop Notes sidebar non-modal with independent toggle state so filter actions cannot dismiss it.
- Render the knowledge graph through a dedicated React Three Fiber viewer; keep graph fetching, filters and the existing inspector in the page to preserve the API contract.
- Use a deterministic procedural brain-shaped network scaffold, separate from real knowledge nodes and links, so sparse graphs retain a recognizable silhouette without inventing user data.
- Batch graph spheres and connections using instanced meshes and buffer geometry to keep draw calls independent of graph size.