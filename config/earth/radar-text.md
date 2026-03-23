<!--
Narrative
Fast Adopters
Open Data
Commonalities
Core Open Source Libraries
Future
 -->

## Open Source in EO

Open source plays a major role in Earth Observation, especially in downstream workflows. The field has deep roots in public research, government programmes, and defence, so the landscape is mixed: some of it is highly open, some of it is closed, and a lot of it sits somewhere in between. But when it comes to downstream Earth Observation workflows, where data is discovered, processed, analysed, and turned into usable products, open source is often the real scaffolding.

Open source Earth Observation tools are often sustained by open science / open source initiatives run by research agencies and public institutions. For example NASA's Earth Science Data Systems program explicitly promotes the open sharing of data, documentation, models, research results, and source code, while ESA's have made open source key to their strategy going forward from 2024 helping people discover, and reuse EO data, code in line with its Open Science approach.

That matters because very few teams want to build an EO stack from scratch, and almost none should. Modern downstream workflows depend on shared building blocks for coordinate reference systems, raster and vector I/O, point cloud processing, metadata, cloud-native storage, scalable analysis, tiling, and machine learning. A large part of that foundation is open. Technologies such as GDAL, PROJ, GeoTIFF are not side tools at the edge of the ecosystem; they are part of the base layer that makes the ecosystem work at all. Even where the final application is commercial or proprietary, the underlying stack is often built on open components.

This is one reason open source has had such an outsized influence in EO. The field has long been shaped by open science as much as by software engineering. Many of the tools, standards, and workflows now used in practice originated in research institutions, government agencies, and academic communities before spreading into wider use.

A large share of these foundational tools has come from a mix of research institutions, public agencies, and open technical communities. Open source has been one of the main routes by which methods move from missions and laboratories into civil, humanitarian, and commercial workflows. It lowers the barrier to entry, supports reproducibility, and makes it far easier to build on existing work instead of rebuilding core parts of a satellite data processing chain from the ground up.

At the same time, Earth Observation isn't an entirely open world. Proprietary platforms, closed analytics pipelines, vertically integrated commercial offerings, and defence-led systems still play a major role. That is the reality of the sector. But downstream EO still leans heavily on open technologies because they make interoperability possible and innovation faster. Open standards and open source tooling allow different datasets, platforms, and organisations to work together in ways that closed stacks rarely do well. 

So the role of open source in Earth Observation is not just theoretical, and it is not limited to hobbyist or academic use. It is practical infrastructure. It is the shared technical layer that helps researchers, startups, public agencies, and humanitarian users turn Earth Observation data into something usable.

## Open Data

When you talk about open source in Earth Observation, you can't really separate it from open data. The tools only matter if people can actually get to the data, reuse it, and work with it.

This is one of the foundations the whole open-source EO community is built on. When data is open, it lowers the bar for getting started. It means researchers can reproduce each other's work. It means public agencies, startups, and everyday users aren't all reinventing the wheel or locked out by proprietary silos. Landsat, Sentinel, Copernicus: these programmes have shown just how much becomes possible when EO data is genuinely accessible.

[do a chart of the amount of open EO data exploding]

There's also a huge amount of often unglamorous work that goes into making that data usable in practice. Standards, metadata, interoperable formats: none of it is exciting on its own, but without it, "open" data is just data you can technically download but can't actually do much with.

And increasingly, the conversation has moved beyond the data itself. Open data is still at the heart of things, but people are paying just as much attention now to the infrastructure around it. Shared platforms, reusable analysis workflows, the connective tissue that turns raw openness into something a community can build on together.


## Adopters

When it comes to who actually uses Earth observation, there's a fairly sharp divide. You're either an expert or a consumer of the data, and surprisingly few organisations are both.

In general open-source Earth Observation is adopted most deeply by the people building and maintaining the stack: research institutions, universities, government programmes, and specialist geospatial teams. They are the ones designing workflows, maintaining tooling, publishing methods, and turning raw EO data into something others can use. That pattern shows up clearly in communities such as Pangeo, which is built around open, reproducible, scalable geoscience, and in OSGeo's wider effort to support open geospatial technology through shared projects, communities, and research networks.

Further down the chain, adoption looks different. A large share of EO users are not EO specialists at all. They are public bodies, businesses, NGOs, researchers, and operational teams using EO in downstream applications, often through products, services, or analytics rather than by building image-processing pipelines themselves. In practice, that means many organisations adopt EO open source indirectly: they depend on it underneath the service, even if they never interact with the tools directly.

So the split in EO is often less about "who uses EO" and more about how they use it. One group builds and operates the infrastructure; the other consumes EO-derived outputs to solve specific problems. Many firms still specialise in downstream work, ESA says the European EO industry is dominated by SMEs mainly active in downstream activities but the boundary is not fixed. EUSPA also notes a growing trend towards vertical integration, with more companies covering the chain from satellite data to value-added services. So there is a middle ground, but it is narrower than in many other software domains, and the deepest open-source adoption still tends to sit with the expert end of the value chain.

Think of your local council in the UK. Although they wouldn't necessarily build a EO pipeline for finding potholes using satellite data, they might buy the intelligence from a company that almost definitely uses open source to analyse roads.


## What's Common Between Earth and Space Open Source

Earth Observation and space observation might serve different domains, but their open-source communities are solving the same fundamental problems: how to store, discover, position, and analyse observational data. The same ideas keep recurring under different names, and increasingly, the same tools.

Both ecosystems are Python-based and organised around a community core project. In EO, that centre is Pangeo: Xarray, Dask, and Zarr. In space observation, Astropy fills the equivalent role. These are not single tools but gravitational centres for wider ecosystems, and the gap between them is closing. An astropy-xarray bridge already lets astronomical data flow through EO workflows.

The clearest example of convergence is HEALPix. Built for astronomy to map cosmic background radiation, it divides the celestial sphere into hierarchical, equal-area cells. In 2016, researchers in New Zealand adapted it for terrestrial use on the WGS84 ellipsoid. Today, xdggs brings HEALPix into Xarray, and the representation has been adopted in DestinE's Climate Digital Twin. An algorithm designed to map the afterglow of the Big Bang is now tiling the Earth for operational climate projection. The same cross-sharing of ideas appears in data discovery, where the USGS Astrogeology Science Center is prototyping STAC catalogues for Mars and Europa imagery using COG formats from EO

..
