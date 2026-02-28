import { Brain, Code, BarChart3, Globe, Calculator, Box, Camera, Database, LucideIcon } from "lucide-react";

export interface CourseData {
  id: string;
  icon: LucideIcon;
  title: string;
  shortDesc: string;
  fullDesc: string;
  duration: string;
  level: string;
  category: "profession" | "course";
  topics: string[];
  topicGroups?: { group: string; items: string[] }[];
  tools: string[];
  highlights?: string[];
}

export const coursesData: CourseData[] = [
  {
    id: "ai",
    icon: Brain,
    title: "Արհեստական Բանականություն (AI)",
    shortDesc: "AI-ն համակարգիչների կողմից մարդկային բանականության նմանակման գիտությունն է։",
    fullDesc: "AI-ն համակարգիչների կողմից մարդկային բանականության նմանակման գիտությունն է։ Այն ներառում է խնդիրների լուծում, որոշումների կայացում, բնական լեզվի մշակում և մեքենայական ընկալում։",
    duration: "3 ամիս",
    level: "Սկսնակ / Միջին",
    category: "profession",
    highlights: [
      "ամբողջական ծրագիր, որի ավարտին կդառնաս մասնագետ",
      "դասախոսներ, որոնք ունեն միջազգային փորձ",
      "3 ամիս՝ հագեցած գործնական ու տեսական դասերով",
    ],
    topicGroups: [
      { group: "Mathematical Foundations", items: ["Գծային հանրահաշիվ", "Հավանականություններ", "Վիճակագրություն"] },
      { group: "Core AI", items: ["Խնդիրների լուծում", "Որոշումների կայացում", "Computer Vision"] },
      { group: "Advanced Topics", items: ["Բնական լեզվի մշակում (NLP)", "Մեքենայական ընկալում", "Նեյրոնային ցանցեր"] },
    ],
    topics: [
      "Խնդիրների լուծում",
      "Որոշումների կայացում",
      "Բնական լեզվի մշակում (NLP)",
      "Մեքենայական ընկալում",
      "Computer Vision",
      "Նեյրոնային ցանցեր",
    ],
    tools: ["Python", "TensorFlow", "PyTorch", "OpenCV", "Hugging Face"],
  },
  {
    id: "ml",
    icon: Database,
    title: "Մեքենայական Ուսուցում (ML)",
    shortDesc: "ML-ը AI-ի ենթադաշտ է, որտեղ համակարգերը սովորում են տվյալների հիման վրա։",
    fullDesc: "ML-ը AI-ի ենթադաշտ է, որտեղ համակարգերը սովորում են տվյալների հիման վրա՝ առանց հստակ ծրագրավորման։",
    duration: "4 ամիս",
    level: "Միջին",
    category: "profession",
    highlights: [
      "ամբողջական ծրագիր, որի ավարտին կդառնաս մասնագետ",
      "դասախոսներ, որոնք ունեն միջազգային փորձ",
      "4 ամիս՝ հագեցած գործնական ու տեսական դասերով",
    ],
    topicGroups: [
      { group: "Programming & Tools", items: ["Python", "Python Libraries (NumPy, Pandas, Matplotlib)"] },
      { group: "Core Machine Learning", items: ["Supervised Learning", "Unsupervised Learning", "Linear Regression", "Classification (kNN, Trees)"] },
      { group: "Advanced ML", items: ["Նեյրոնային ցանցեր", "Խորը ուսուցում (Deep Learning)", "Reinforcement Learning"] },
      { group: "Industry Applications", items: ["Մոդելների գնահատում", "MLOps", "Data Engineering"] },
    ],
    topics: [
      "Supervised Learning",
      "Unsupervised Learning",
      "Նեյրոնային ցանցեր",
      "Խորը ուսուցում (Deep Learning)",
      "Reinforcement Learning",
      "Մոդելների գնահատում",
    ],
    tools: ["Python", "Scikit-learn", "TensorFlow", "Keras", "Pandas", "NumPy"],
  },
  {
    id: "python",
    icon: Code,
    title: "Python Ծրագրավորում",
    shortDesc: "Python-ը ամենահայտնի ծրագրավորման լեզուներից է, հատկապես AI-ի համար։",
    fullDesc: "Python-ը ամենահայտնի ծրագրավորման լեզուներից է, հատկապես տվյալների գիտության և AI-ի համար։",
    duration: "2.5 ամիս",
    level: "Սկսնակ",
    category: "course",
    topics: [
      "փոփոխականներ, տիպեր, օպերատորներ",
      "ֆունկցիաներ և OOP",
      "NumPy և Pandas",
      "TensorFlow հիմունքներ",
      "Տվյալների վիզուալիզացիա",
      "Նախագծերի մշակում",
    ],
    tools: ["Python 3", "Jupyter Notebook", "NumPy", "Pandas", "Matplotlib"],
  },
  {
    id: "web",
    icon: Globe,
    title: "Web Ծրագրավորում",
    shortDesc: "HTML5, CSS3, JavaScript, Responsive Design և իրական վեբ նախագծեր։",
    fullDesc: "Դասընթացը նախատեսված է սկսնակների և այն մարդկանց համար, ովքեր ցանկանում են յուրացնել վեբ ծրագրավորման հիմունքները։",
    duration: "3 ամիս",
    level: "Սկսնակ",
    category: "course",
    topics: [
      "HTML5 և CSS3",
      "JavaScript ES6+",
      "DOM և BOM",
      "Responsive Design",
      "GIT և GitHub",
      "Asynchronous JavaScript",
    ],
    tools: ["VS Code", "Chrome DevTools", "Git", "GitHub", "Figma"],
  },
  {
    id: "math",
    icon: Calculator,
    title: "Մաթեմատիկա",
    shortDesc: "Գծային հանրահաշիվ, հավանականություններ, վիճակագրություն և դիսկրետ մաթեմատիկա։",
    fullDesc: "Մաթեմատիկան հանդիսանում է բոլոր տեխնիկական գիտությունների հիմքը։",
    duration: "2 ամիս",
    level: "Սկսնակ / Միջին",
    category: "course",
    topics: [
      "Գծային հանրահաշիվ",
      "Հավանականություններ",
      "Վիճակագրություն",
      "Դիսկրետ մաթեմատիկա",
      "Մատրիցներ և վեկտորներ",
      "Օպտիմիզացիա",
    ],
    tools: ["MATLAB", "Python", "LaTeX", "Wolfram Alpha"],
  },
  {
    id: "3dsmax",
    icon: Box,
    title: "3ds Max",
    shortDesc: "3D մոդելավորում, անիմացիա և վիզուալիզացիա։",
    fullDesc: "3ds Max-ը հզոր գործիք է 3D մոդելավորման, անիմացիայի և վիզուալիզացիայի համար։",
    duration: "3 ամիս",
    level: "Սկսնակ / Պրոֆեսիոնալ",
    category: "course",
    topics: [
      "3D մոդելավորում",
      "Նյութերի ստեղծում",
      "Լուսավորություն",
      "Ռենդերինգ",
      "Անիմացիա",
      "V-Ray / Corona",
    ],
    tools: ["3ds Max", "V-Ray", "Corona Renderer", "Photoshop"],
  },
  {
    id: "data-viz",
    icon: BarChart3,
    title: "Տվյալների Վիզուալիզացիա",
    shortDesc: "Matplotlib, Seaborn և Tableau գործիքներով տվյալների վիզուալիզացիա։",
    fullDesc: "Տվյալների վիզուալիզացիան թույլ է տալիս հասկանալ և ներկայացնել բարդ տեղեկատվությունը։",
    duration: "2 ամիս",
    level: "Միջին",
    category: "course",
    topics: [
      "Matplotlib",
      "Seaborn",
      "Tableau",
      "Ինտերակտիվ դաշբորդներ",
      "Տվյալների վերլուծություն",
      "Dashboard ստեղծում",
    ],
    tools: ["Python", "Matplotlib", "Seaborn", "Tableau", "Power BI"],
  },
  {
    id: "photography",
    icon: Camera,
    title: "Լուսանկարչություն",
    shortDesc: "Կոմպոզիցիա, լուսավորություն, կադրավորում և հետմշակում։",
    fullDesc: "Լուսանկարչությունը արվեստ է և գիտություն։",
    duration: "2 ամիս",
    level: "Սկսնակ",
    category: "course",
    topics: [
      "Կոմպոզիցիա",
      "Լուսավորություն",
      "Կադրավորում",
      "Հետմշակում",
      "DSLR տեսախցիկներ",
      "Adobe Photoshop & Lightroom",
    ],
    tools: ["Adobe Photoshop", "Adobe Lightroom", "DSLR Camera", "Studio Equipment"],
  },
];