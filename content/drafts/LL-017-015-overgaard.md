---
title: "Policy & Disclosure Pages"
short_title: "Policy & Disclosure Pages"
date: "2026-08-30"
---



# DOCUMENT 1: POLICY & DISCLOSURE PAGES (LL-017)

## Privacy Policy

**Last Updated:** [Date]

At Loki's Lab ("we," "us," or "our"), we are committed to transparency regarding your privacy. This policy applies specifically to our website and editorial activities covering local AI, autonomous agents, and homelab technology.

**Data Collection Practices**
We adhere strictly to a minimal data collection philosophy. We do not employ third-party analytics trackers that collect personally identifiable information (PII) in the background. The only personal data we may collect is voluntarily submitted via contact forms or newsletter subscriptions.

**Contributor Privacy**
All contributor email addresses and private notes submitted for review purposes are encrypted and stored securely on our local server infrastructure. Under no circumstances are contributor emails or private internal notes published to the public website without explicit written consent from the contributor and a specific request from the editor. Your identity remains anonymous unless you choose to publish your own hardware build logs.

**Use of Data**
Data is used solely for:
1. Contacting contributors regarding review status.
2. Responding to site inquiries (newsletter subscriptions).
3. Administrative notifications only.

We do not sell your data, nor do we share it with advertisers or third parties.

**Security**
Because Loki's Lab focuses on local AI and privacy-preserving infrastructure, our own security posture aligns with these values. We use end-to-end encryption for contributor communications and maintain strict access controls to our editorial database.

## Terms of Service

By accessing Loki's Lab, you agree to the following terms.

**Acceptance of Terms**
These terms constitute a legal agreement between you and Loki's Lab. Accessing the site indicates your acceptance.

**No Warranty**
All content provided on Loki's Lab is for informational purposes only. Benchmarks, reviews, and software configurations are provided "as-is" without warranty of any kind. Using our guides involves risk (e.g., local AI deployment, hardware modifications). We are not liable for hardware damage or data loss resulting from following our tutorials.

**Intellectual Property**
All original editorial content, images, and code snippets provided by Loki's Lab authors belong to the author and are licensed under Creative Commons Attribution-ShareAlike (CC BY-SA) unless specified otherwise. Aggregated links remain the property of their respective owners.

**Free-First Stance**
Loki's Lab operates on a free-first principle. While we may offer premium hosting or specialized hardware resources for contributors, the core educational content remains accessible without cost barriers. This ensures our community stays independent and unencumbered by paywalls designed to monetize knowledge.

**Disclaimers**
We do not endorse specific brands beyond those tested. We reserve the right to remove any content that violates community guidelines or local laws regarding AI usage and copyright.

## Affiliate Disclosure

If you make a purchase through links on our website that belong to specific programs, we may receive a commission at no additional cost to you. However, this policy does not apply to our primary affiliate network which is explicitly disclosed per section below.

**Third-Party Affiliates**
Links to products (e.g., specific NAS drives, GPUs, or cloud VPS) are often affiliated with the retailer providing the service. This revenue helps sustain the server infrastructure and contributor stipends. We only affiliate with programs that allow us to maintain editorial independence.

**Disclosure Obligation**
All affiliate links will be clearly marked with an "Ad" or "Affiliate" badge at the top of the relevant content block. If a product is listed in our benchmark tables, it is selected based on performance metrics and value, not solely for commission availability.

## Sponsorship Independence Policy

Loki's Lab maintains strict editorial independence regarding sponsored content.

**Sponsor Permissions**
Sponsors may provide hardware, Virtual Private Server (VPS) resources, or testing equipment to Loki's Lab contributors. This facilitates our ability to run high-end benchmarks for the community.

**Prohibitions on Buying Results**
Under no circumstances will a sponsor influence the results published. A sponsor **cannot**:
*   Require positive reviews of their products.
*   Demand access to raw benchmark logs prior to publication.
*   Dictate the configuration settings used in testing.

**Transparency Requirement**
All hardware or services provided by a third party must be disclosed in the metadata of the specific article (Author Note / Sourcing Section). If a VPS was sponsored for a specific AI deployment test, this will be stated clearly within the methodology section of that benchmark report. The final output belongs to Loki's Lab and reflects the independent assessment of the editorial team.

## Correction Policy

Loki's Lab takes accuracy seriously, especially regarding numerical data in benchmarks and code configurations.

**How to Submit a Correction**
If you identify an error in a benchmark table (e.g., a CPU score misread), a tutorial step (incorrect git commit hash), or a hardware specification:
1. Contact us via the privacy policy email address.
2. Provide the link to the specific article.
3. Include the proposed correction and evidence (screenshots, raw logs, alternative sources).

**Implementation Process**
Our editorial team will review the submission within 48 hours. Corrections will be made publicly on the post, with a "Correction" tag added at the top of the text for one year to preserve historical accuracy.

If a benchmark result is fundamentally flawed (e.g., wrong hardware ID used), we reserve the right to retract the data entirely and replace it with verified figures.

**Acknowledgment**
We appreciate community vigilance. Public corrections enhance our collective understanding of the technology landscape.

## Benchmark Disclaimer

Data presented on Loki's Lab regarding local AI performance, autonomous agent latency, and homelab throughput is indicative only.

**Hardware Variance**
Benchmarks are conducted on specific hardware generations. A GPU tested today may not perform identically if updated drivers or firmware changes occur in the intervening time. Results are snapshots in time.

**Environment Factors**
Performance metrics are sensitive to:
*   Ambient temperature and thermal throttling.
*   Network latency (for agent testing).
*   Background system tasks and resource contention.
*   Specific software versions (Linux kernels, CUDA drivers, Python versions).

**Reproducibility**
While we strive for reproducibility in our testing, exact replication of a 300% increase in inference speed is not guaranteed due to the proprietary nature of some models or hardware-specific optimizations (e.g., NVidia vs. AMD vendor specific quirks). Always benchmark on your own local machine before purchasing expensive hardware based on our reviews.

---

# DOCUMENT 2: LAB NOTES CONTENT TYPES SPEC (LL-015)

## Overview
This specification defines the taxonomy for original editorial content within Loki's Lab. Content is categorized into "Original Editorial Commentary" and "Aggregated Source Links." Only Original Editorial Commentary counts toward authorship metrics, site SEO authority on core topics, and community trust scores.

The primary goal of this spec is to ensure high-quality, opinionated analysis rather than simple news reposting or broken link pages.

## Content Type Specifications

### 1. Reactions
*   **Purpose:** Immediate commentary on industry news, model releases, or hardware announcements. These articles interpret the significance of a new release within the context of local AI feasibility.
*   **Required Metadata:** Author Name, Date of Publication, Tags (e.g., #IndustryNews, #ShortForm), Disclosure (Conflicts of interest).
*   **Difference from Aggregated Links:** A "Reaction" must contain at least 30% original word count that synthesizes the news rather than just linking to the source. It must offer Loki's Lab perspective, whereas an aggregated link simply provides a direct URL to the breaking news site without editorial synthesis.

### 2. Field Reports
*   **Purpose:** Narrative documentation of real-world deployments. The author describes their personal setup journey (e.g., "I bought this VPS," or "I tried running Ollama on this legacy hardware"). It emphasizes the practical challenges and success rates rather than raw numbers alone.
*   **Required Metadata:** Author Name, Date of Publication, Tags (e.g., #HomelabJourney, #CaseStudy), Disclosure (Current Hardware Status).
*   **Difference from Aggregated Links:** While these often contain links to tutorials used during the build, the core text must be a first-person narrative describing the author's specific experiences. An aggregated link simply shares a URL about someone else's build without claiming that experience or analyzing it for a specific context.

### 3. Reviews
*   **Purpose:** Critical assessment of software, models, or hardware acquired specifically for testing. This includes pros/cons analysis and value proposition against similar products in the market.
*   **Required Metadata:** Author Name, Date of Publication, Tags (e.g., #SoftwareReview, #HardwareReview), Disclosure (Product provided/Sponsored status).
*   **Difference from Aggregated Links:** A review requires structured evaluation criteria (Speed, Accuracy, Ease of Setup, Price). Aggregated links typically serve as a "Best X List" without deep analysis. We require an editorial opinion on *why* a product is recommended or not, distinguishing it from a simple catalog listing.

### 4. Tutorials
*   **Purpose:** Step-by-step guides to install software, configure agents, or deploy models on local hardware. These are instructional resources designed for reproducibility.
*   **Required Metadata:** Author Name, Date of Publication, Tags (e.g., #Guide, #Install), Disclosure (Version of software tested).
*   **Difference from Aggregated Links:** Tutorials must include original command-line snippets and configuration explanations specific to the author's testing environment. An aggregated link might point to a generic YouTube video; this document must contain copy-pasteable code and troubleshooting steps authored by Loki's Lab staff or contributors.

### 5. Hardware Notes
*   **Purpose:** Deep dives into specific hardware components (GPUs, Motherboards) regarding compatibility with specific AI workloads. This includes thermal performance notes, power consumption logs, and driver issues.
*   **Required Metadata:** Author Name, Date of Publication, Tags (e.g., #ComponentAnalysis, #Hardware), Disclosure (Testing Hardware Configuration).
*   **Difference from Aggregated Links:** Hardware Notes analyze data collected directly in the lab environment or through specific stress tests. An aggregated link on hardware specs simply summarizes manufacturer white papers; our notes must include original testing context (e.g., "We found this CPU overheated under Xload").

### 6. Test Write-ups
*   **Purpose:** Raw presentation of benchmark results, latency logs, and throughput charts. These articles provide the data tables that other editorial pieces may analyze.
*   **Required Metadata:** Author Name, Date of Publication, Tags (e.g., #DataReport), Disclosure (Sponsorship/Free Hardware Source).
*   **Difference from Aggregated Links:** Test Write-ups publish new data. They are distinct because they require raw log ingestion and chart generation by the team. An aggregated link points to existing benchmarks on other sites. We only publish Test Write-ups when the lab runs a fresh test or when new methodologies are introduced.

## Content Submission Guidelines
All contributors must submit drafts of original editorial content via the private editor's interface for review prior to publication. Private notes attached to these drafts (such as raw chat logs from agent testing) are kept separate and never published in full without redaction or authorization. All final published articles must link back to their internal draft ID in the backend database to verify authorship provenance against this specification.