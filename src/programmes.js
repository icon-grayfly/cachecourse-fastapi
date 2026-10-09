const MIVA_CATALOGUE_URL = "https://miva.edu.ng/miva-programmes/";
const MIVA_COMPUTER_SCIENCE_URL = "https://miva.edu.ng/bsc-in-computer-science/";

const definitions = [
  ["computer-science", "BSc. Computer Science", "School of Computing", "Undergraduate", "BSc", "A broad foundation in programming, data structures, algorithms, operating systems, and related computing areas.", MIVA_COMPUTER_SCIENCE_URL],
  ["cybersecurity", "BSc. Cybersecurity", "School of Computing", "Undergraduate", "BSc", "Computing foundations focused on protecting systems, networks, and information.", "https://miva.edu.ng/bsc-in-cybersecurity/"],
  ["data-science", "BSc. Data Science", "School of Computing", "Undergraduate", "BSc", "Data analysis, statistics, and machine learning for evidence-based decisions.", "https://miva.edu.ng/bsc-in-data-science/"],
  ["software-engineering", "BSc. Software Engineering", "School of Computing", "Undergraduate", "BSc", "Engineering practices for designing, building, testing, and maintaining software.", "https://miva.edu.ng/bsc-software-engineering/"],
  ["information-technology", "BSc. Information Technology", "School of Computing", "Undergraduate", "BSc", "Information systems and technology skills for organisations and users.", "https://miva.edu.ng/bsc-information-technology/"],
  ["artificial-intelligence", "BSc. Artificial Intelligence", "School of Computing", "Undergraduate", "BSc", "Programming, algorithms, machine learning, and applied intelligent systems.", "https://miva.edu.ng/bsc-artificial-intelligence/"],
  ["business-management", "BSc. Business Management", "School of Management and Social Sciences", "Undergraduate", "BSc", "Management, strategy, operations, marketing, finance, and leadership foundations.", "https://miva.edu.ng/bsc-in-business-management/"],
  ["economics", "BSc. Economics", "School of Management and Social Sciences", "Undergraduate", "BSc", "Economic ideas and analysis for business, public service, and policy contexts.", "https://miva.edu.ng/bsc-in-economics/"],
  ["accounting", "BSc. Accounting", "School of Management and Social Sciences", "Undergraduate", "BSc", "Financial and management accounting, audit, tax, and information systems.", "https://miva.edu.ng/bsc-in-accounting/"],
  ["public-policy-administration", "BSc. Public Policy and Administration", "School of Management and Social Sciences", "Undergraduate", "BSc", "Policy, public administration, governance, and service delivery.", "https://miva.edu.ng/bsc-public-policy-and-administration/"],
  ["entrepreneurship", "BSc. Entrepreneurship", "School of Management and Social Sciences", "Undergraduate", "BSc", "Opportunity discovery, venture design, and the skills to develop a business.", "https://miva.edu.ng/bsc-entrepreneurship/"],
  ["criminology-security", "BSc. Criminology and Security Studies", "School of Management and Social Sciences", "Undergraduate", "BSc", "Crime, security, justice, and the social systems around them.", "https://miva.edu.ng/bsc-criminology-and-security-studies/"],
  ["international-relations", "BSc. International Relations", "School of Management and Social Sciences", "Undergraduate", "BSc", "International affairs, diplomacy, global politics, and institutions.", MIVA_CATALOGUE_URL],
  ["political-science", "BSc. Political Science", "School of Management and Social Sciences", "Undergraduate", "BSc", "Political systems, governance, public policy, and political analysis.", "https://miva.edu.ng/bsc-in-political-science/"],
  ["logistics-supply-chain", "BSc. Logistics and Supply Chain Management", "School of Management and Social Sciences", "Undergraduate", "BSc", "Logistics, procurement, transport, inventory, operations, and supply chains.", MIVA_CATALOGUE_URL],
  ["project-management", "BSc. Project Management", "School of Management and Social Sciences", "Undergraduate", "BSc", "Project planning, delivery, digital tools, and contemporary methods.", "https://miva.edu.ng/bsc-in-project-management/"],
  ["mass-communication", "BSc. Mass Communication and Media Studies", "School of Communication and Media Studies", "Undergraduate", "BSc", "Media writing, storytelling, production, media law, and digital communication.", "https://miva.edu.ng/bsc-mass-communication/"],
  ["nursing-science", "B.NSc. Nursing Science", "School of Allied Health Sciences", "Undergraduate", "B.NSc", "Nursing knowledge and practice for the changing healthcare environment.", "https://miva.edu.ng/bnsc-in-nursing/"],
  ["public-health", "BSc. Public Health", "School of Allied Health Sciences", "Undergraduate", "BSc", "Population health, research, policy, prevention, and community wellbeing.", "https://miva.edu.ng/bsc-in-public-health/"],
  ["community-health-science", "B.CHS Community Health Science", "School of Allied Health Sciences", "Undergraduate", "B.CHS", "Community health, prevention, health promotion, and local programmes.", "https://miva.edu.ng/bchs-community-health-science/"],
  ["environmental-health-science", "B.EHS Environmental Health Science", "School of Allied Health Sciences", "Undergraduate", "B.EHS", "Environmental risks, safety, sustainability, and public health.", "https://miva.edu.ng/behs-environmental-health-science/"],
  ["early-childhood-education", "B.Ed Early Childhood Education", "School of Education", "Undergraduate", "B.Ed", "Learning and development in early childhood and early education settings.", "https://miva.edu.ng/bed-early-childhood-education/"],
  ["primary-education", "B.Ed Primary Education", "School of Education", "Undergraduate", "B.Ed", "Teaching practice and foundational learning in primary education.", "https://miva.edu.ng/bed-primary-education/"],
  ["educational-technology", "B.Ed Educational Technology", "School of Education", "Undergraduate", "B.Ed", "Design and management of technology-supported learning experiences.", "https://miva.edu.ng/bed-in-educational-technology/"],
  ["mba", "Master of Business Administration", "School of Postgraduate Studies", "Masters", "MBA", "Advanced business leadership, strategy, management, and executive decision-making.", "https://mba.miva.university/"],
  ["mit", "Master of Information Technology", "School of Postgraduate Studies", "Masters", "MIT", "Technology leadership, cybersecurity, data systems, and digital innovation.", "https://mit.miva.university/"],
  ["mpa", "Master of Public Administration", "School of Postgraduate Studies", "Masters", "MPA", "Public leadership, policy design, governance, and institutional improvement.", "https://mpa.miva.university/"],
  ["mph", "Master of Public Health", "School of Postgraduate Studies", "Masters", "MPH", "Public health leadership, health systems, prevention, and programme design.", "https://mph.miva.university/"],
  ["m-criminology-security", "Master of Criminology and Security Management", "School of Postgraduate Studies", "Masters", "M.CSM", "Advanced criminology, security planning, intelligence, and legal frameworks.", MIVA_CATALOGUE_URL],
  ["m-international-sustainable-development", "Master of International and Sustainable Development", "School of Postgraduate Studies", "Masters", "M.ISD", "International development, sustainability, policy, and programme design.", MIVA_CATALOGUE_URL],
  ["m-supply-chain", "Master of Supply Chain Management", "School of Postgraduate Studies", "Masters", "M.SCM", "Supply chain strategy, procurement, logistics, inventory, and operations.", MIVA_CATALOGUE_URL],
  ["m-economic-policy", "Master of Economic Policy Management", "School of Postgraduate Studies", "Masters", "M.EPM", "Economic policy design, analysis, implementation, and evaluation.", MIVA_CATALOGUE_URL],
  ["m-communication-media", "Master of Communication and Media Practice", "School of Postgraduate Studies", "Masters", "M.CMP", "Advanced communication, media practice, advertising, branding, and strategy.", MIVA_CATALOGUE_URL],
  ["dba", "Doctor of Business Administration", "School of Postgraduate Studies", "Doctoral", "DBA", "Applied research and leadership for complex business and organisational challenges.", MIVA_CATALOGUE_URL],
  ["dph", "Doctor of Public Health", "School of Postgraduate Studies", "Doctoral", "DPH", "Advanced public health leadership, research, policy, and programme transformation.", MIVA_CATALOGUE_URL],
  ["dpa", "Doctor of Public Administration", "School of Postgraduate Studies", "Doctoral", "DPA", "Public-sector leadership, research, policy, and institutional transformation.", MIVA_CATALOGUE_URL],
  ["dit", "Doctor of Information Technology", "School of Postgraduate Studies", "Doctoral", "DIT", "Technology leadership, digital transformation, and applied IT research.", MIVA_CATALOGUE_URL],
  ["m-artificial-intelligence", "Master of Artificial Intelligence", "School of Postgraduate Studies", "Masters", "M.AI", "Intelligent systems, data-driven solutions, and applied AI technologies.", MIVA_CATALOGUE_URL]
];

const csCurriculum = [
  ["100 Level · Semester 1", ["Communication in English I", "Elementary Mathematics I – Algebra and Trigonometry", "General Physics I – Mechanics", "General Practical Physics I", "Use of Library, Study Skills and ICT", "Descriptive Statistics", "Introduction to Computing Sciences", "Environment and Sustainability (Elective)", "Contemporary Health Issues (Elective)"]],
  ["100 Level · Semester 2", ["Problem Solving", "Nigerian People and Culture", "Elementary Mathematics II – Calculus", "General Physics II – Electricity & Magnetism", "General Practical Physics II", "Introduction to Web Technologies", "Communication in English II"]],
  ["200 Level · Semester 1", ["Entrepreneurship and Innovation", "Mathematical Methods I", "Computer Programming I", "Discrete Structures", "Digital Logic Design", "Introduction to Software Engineering", "SIWES I"]],
  ["200 Level · Semester 2", ["Philosophy, Logic and Human Existence", "Elementary Differential Equations", "Computer Programming II", "Computer Architecture and Organisation", "Statistical Computing Inference and Modelling", "Linear Algebra II", "Introduction to Electric Circuits and Electronics"]],
  ["300 Level · Semester 1", ["Data Structures", "Artificial Intelligence", "Introduction to Cyber Security and Strategy", "Introduction to Data Management", "Data Communication System and Network", "SIWES II"]],
  ["300 Level · Semester 2", ["Peace and Conflict Resolution", "Venture Creation", "Operating Systems", "Computer Science Innovation and New Technologies", "Data Management I", "Web Application Development", "Introduction to Cloud Computing (Elective)", "Big Data Technology (Elective)"]],
  ["400 Level · Semester 1", ["Research Methodology and Technical Report Writing", "Algorithms and Complexity Analysis", "Project Management", "Distributed Computing", "Organization of Programming Languages", "Final Year Project I"]],
  ["400 Level · Semester 2", ["Ethical and Legal Issues in Computer Science", "Machine Learning", "Human Computer Interaction", "Final Year Project II", "Compiler Construction", "Cloud Computing Security"]]
];

const optionalVideos = {
  "computer-science": [{ id: "fastapi-complete", title: "FastAPI - The Complete Course 2026", detail: "Optional backend API video extension for learners who want guided practice beyond the public Computer Science course-title outline.", duration: "21h 28m · Udemy", href: "https://www.udemy.com/course/fastapi-the-complete-course/", source: "Udemy · Eric Roby and Chad Darby" }],
  "cybersecurity": [{ id: "cybersecurity-fundamentals", title: "Cybersecurity Fundamentals: Key Concepts and Strategies", detail: "Third-party introductory video course. Review its outline and practice safely in authorized environments only.", duration: "2h 52m · Udemy", href: "https://www.udemy.com/course/cybersecurity-fundamentals-key-concepts-and-strategies/", source: "Udemy · Doğaç Artem" }],
  "data-science": [{ id: "machine-learning-az", title: "Machine Learning A-Z [2026]: ML, DL, AI with AWS, Python & R", detail: "Optional long-form video course that introduces supervised and unsupervised machine-learning workflows.", duration: "49h 14m · Udemy", href: "https://www.udemy.com/course/machinelearning/", source: "Udemy · Kirill Eremenko, Hadelin de Ponteves, SuperDataScience Team and Ligency" }],
  "artificial-intelligence": [{ id: "machine-learning-az", title: "Machine Learning A-Z [2026]: ML, DL, AI with AWS, Python & R", detail: "Optional long-form video course that introduces supervised and unsupervised machine-learning workflows.", duration: "49h 14m · Udemy", href: "https://www.udemy.com/course/machinelearning/", source: "Udemy · Kirill Eremenko, Hadelin de Ponteves, SuperDataScience Team and Ligency" }],
  "software-engineering": [{ id: "fastapi-complete", title: "FastAPI - The Complete Course 2026", detail: "Optional backend API video extension covering FastAPI projects and deployment topics.", duration: "21h 28m · Udemy", href: "https://www.udemy.com/course/fastapi-the-complete-course/", source: "Udemy · Eric Roby and Chad Darby" }],
  "information-technology": [{ id: "cybersecurity-fundamentals", title: "Cybersecurity Fundamentals: Key Concepts and Strategies", detail: "Optional introductory video course about cybersecurity concepts, common threats, and defensive practice.", duration: "2h 52m · Udemy", href: "https://www.udemy.com/course/cybersecurity-fundamentals-key-concepts-and-strategies/", source: "Udemy · Doğaç Artem" }],
  "business-management": [{ id: "business-management-entrepreneurship", title: "Diploma Course in Business Management and Entrepreneurship", detail: "Optional third-party video material covering management, leadership, strategy, and entrepreneurship topics.", duration: "10h 58m · Udemy", href: "https://www.udemy.com/course/diploma-in-management-and-entrepreneurship/", source: "Udemy · Aakaro Consulting" }],
  "entrepreneurship": [{ id: "start-business-idea", title: "Entrepreneurship: How To Start A Business From An Idea", detail: "Optional on-demand video course about moving from an initial business idea toward research and a plan.", duration: "Udemy video · check current listing", href: "https://www.udemy.com/course/how-to-start-a-business-go-from-business-idea-to-a-business/", source: "Udemy · Alex Genadinik" }],
  "mass-communication": [{ id: "digital-marketing", title: "The Ultimate Digital Marketing Course 2026: 11 Courses in 1", detail: "Optional digital-marketing video extension related to audience research, online publishing, and promotion.", duration: "Udemy video · check current listing", href: "https://www.udemy.com/course/the-ultimate-digital-marketing-course/", source: "Udemy · Joshua George and ClickSlice Ltd" }],
  "educational-technology": [{ id: "instructional-designer", title: "The Complete Instructional Designer Course", detail: "Optional video course introducing learning needs analysis, instructional design, and portfolio development.", duration: "5h 59m · Udemy", href: "https://www.udemy.com/course/online-course-creation-introduction-to-instructional-design/", source: "Udemy · John Hinchliffe" }]
};

function videoItem(resource) {
  return {
    moduleKey: "resource:udemy:" + resource.id,
    title: resource.title,
    detail: resource.detail,
    duration: resource.duration,
    type: "Optional external video course",
    href: resource.href,
    source: resource.source,
    sourceLicense: "Proprietary course · CacheCourse links only",
    sourceCheckedAt: "9 Oct 2026",
    access: "Online · may require a Udemy account and paid enrolment"
  };
}

function optionalVideoViews(slug) {
  const videos = optionalVideos[slug] || [];
  return {
    weeks: videos.length ? [{ title: "Optional video resources", subtitle: "Third-party on-demand classes · supplementary, not Miva syllabus material", items: videos.map(videoItem) }] : [],
    sessions: videos.map((video) => ({ title: "Video session · " + video.title, subtitle: "Suggested flexible session · external video and internet access required", items: [videoItem(video)] }))
  };
}

function curriculumViews(id, url) {
  if (id !== "computer-science") return null;
  const groups = csCurriculum.map(([title, courseTitles], levelIndex) => ({
    title,
    subtitle: "Public Miva programme outline · course titles only",
    items: courseTitles.map((unitTitle, unitIndex) => ({
      moduleKey: "miva-cs:" + levelIndex + ":" + unitIndex,
      title: unitTitle,
      detail: "Course title listed in Miva’s published Computer Science curriculum. CacheCourse has not converted this unit into a lesson yet.",
      duration: "Syllabus listing",
      type: "Official curriculum reference",
      href: url,
      source: "Miva Open University · BSc Computer Science curriculum",
      sourceLicense: "Official source page · linked, not reproduced",
      sourceCheckedAt: "9 Oct 2026",
      access: "Online source"
    }))
  }));
  const videos = optionalVideoViews(id);
  return { weeks: [...groups, ...videos.weeks], sessions: [...groups, ...videos.sessions] };
}

export const PROGRAMMES = definitions.map(([slug, title, department, qualification, code, description, officialUrl]) => {
  const id = "miva-" + slug;
  const module = {
    moduleKey: "programme:" + slug,
    title: "Open the official programme page",
    detail: "Review Miva’s current programme outline, admission information, and published curriculum.",
    duration: "Official source",
    type: "Programme reference",
    href: officialUrl,
    source: "Miva Open University · programme catalogue",
    sourceLicense: "Official source page · linked, not reproduced",
    sourceCheckedAt: "9 Oct 2026",
    access: "Online source"
  };
  const standardViews = {
    weeks: [{ title: "Programme overview", subtitle: "Miva programme listing · external access required", items: [module] }, ...optionalVideoViews(slug).weeks],
    sessions: [{ title: "Programme overview", subtitle: "Miva programme listing · external access required", items: [module] }, ...optionalVideoViews(slug).sessions]
  };
  return {
    id,
    kind: "programme",
    institution: "Miva Open University",
    department,
    code,
    title,
    description,
    level: qualification === "Undergraduate" ? "Undergraduate degree" : qualification + " programme",
    qualification,
    category: "Academic programme",
    accent: "miva",
    format: qualification === "Undergraduate" ? "Undergraduate · Miva programme" : qualification + " · Miva programme",
    officialUrl,
    catalogueUrl: MIVA_CATALOGUE_URL,
    sourceNote: "Listed in the Miva Open University programme catalogue · checked 9 Oct 2026",
    interactiveCount: 0,
    views: curriculumViews(slug, officialUrl) || standardViews
  };
});

export const MIVA_CATALOGUE_SOURCE = MIVA_CATALOGUE_URL;
export const MIVA_CS_SOURCE = MIVA_COMPUTER_SCIENCE_URL;
