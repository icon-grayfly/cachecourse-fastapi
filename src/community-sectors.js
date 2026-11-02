export const COMMUNITY_SECTORS = [
  {
    id: "banking-finance",
    name: "Banking & Finance",
    icon: "$",
    summary: "Talk about banking, financial services, accounting, insurance, and how people and businesses manage money."
  },
  {
    id: "software-data",
    name: "Software & Data",
    icon: "{ }",
    summary: "Explore software, data, digital products, information systems, and technology careers."
  },
  {
    id: "oil-gas-energy",
    name: "Oil, Gas & Energy",
    icon: "⚡",
    summary: "Connect around energy, utilities, renewables, petroleum, and the transition to a more sustainable energy future."
  },
  {
    id: "healthcare-life-sciences",
    name: "Healthcare & Life Sciences",
    icon: "+",
    summary: "Share perspectives on healthcare, public health, life sciences, health technology, and care."
  },
  {
    id: "education-research",
    name: "Education & Research",
    icon: "✎",
    summary: "Discuss teaching, learning, research, academic pathways, and ways to share knowledge."
  },
  {
    id: "business-entrepreneurship",
    name: "Business & Entrepreneurship",
    icon: "↗",
    summary: "Connect around starting and growing businesses, operations, leadership, and new ideas."
  },
  {
    id: "law-public-policy",
    name: "Law & Public Policy",
    icon: "§",
    summary: "Explore legal careers, public service, policy, governance, and civic participation."
  },
  {
    id: "media-communications",
    name: "Media & Communications",
    icon: "◎",
    summary: "Share ideas about journalism, storytelling, content, design, public relations, and communication."
  },
  {
    id: "engineering-manufacturing",
    name: "Engineering & Manufacturing",
    icon: "⚙",
    summary: "Discuss engineering, construction, manufacturing, infrastructure, and practical design."
  },
  {
    id: "agriculture-environment",
    name: "Agriculture & Environment",
    icon: "⌂",
    summary: "Connect around agriculture, food systems, conservation, climate, and environmental work."
  }
];

export function getCommunitySector(id) {
  return COMMUNITY_SECTORS.find((sector) => sector.id === id);
}
