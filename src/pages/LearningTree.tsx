import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiBook, 
  FiCheck, 
  FiStar, 
  FiTrendingUp, 
  FiBriefcase, 
  FiSearch, 
  FiAward, 
  FiTarget,
  FiArrowRight,
  FiBookmark,
  FiCpu
} from 'react-icons/fi';
import axios from 'axios';

// Types
interface Skill {
  name: string;
  progress: number;
  status: 'completed' | 'in-progress' | 'recommended';
  category?: string;
}

interface CareerPath {
  title: string;
  category: string;
  match: number;
  skills: Skill[];
  description: string;
  missingSkills: string[];
}

interface SkillCategories {
  [key: string]: string[];
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 }
};

// Available skills list
const AVAILABLE_SKILLS = [
  '5G', 'APIs', 'AWS', 'Actuarial', 'Aerodynamics', 'Algorithms', 'Allocation', 
  'Analysis', 'Analytics', 'Architecture', 'Assessment', 'Asset', 'AutoCAD', 
  'Automation', 'BI', 'Banking', 'Basel', 'Biochemistry', 'Bloomberg', 'Bond', 
  'Budgeting', 'Business', 'C++', 'C/C++', 'CAD', 'CAM', 'CDISC', 'CFD', 
  'Capital', 'Care', 'Cash', 'Chemical', 'Circuit', 'Client', 'Clinical', 
  'Commodities', 'Commodity', 'Communication', 'Compliance', 'Computer', 
  'Control', 'Credit', 'Data', 'Deep', 'Design', 'Development', 'Device', 
  'Digital', 'Diligence', 'Distribution', 'Documentation', 'Drug', 'Due', 
  'Dynamics', 'EHR', 'ERP', 'Economic', 'Education', 'Engineering', 
  'Environmental', 'Equity', 'Ergonomics', 'Estate', 'Excel', 'Exchange', 
  'FDA', 'FEA', 'FPGA', 'Fabrication', 'Fermentation', 'Finance', 'Financial', 
  'Fluid', 'Forecasting', 'Foreign', 'GCP', 'GD&T', 'Geology', 'Grant', 'Grid', 
  'HIPAA', 'HMI', 'Health', 'Healthcare', 'ISO', 'IT', 'Industrial', 'Industry', 
  'Infrastructure', 'Integration', 'Intelligence', 'Inventory', 'Investment', 
  'JavaScript', 'Knowledge', 'Laws', 'Layout', 'Leadership', 'Lean', 'Learning', 
  'License', 'Logistics', 'M&A', 'Machine', 'Management', 'Manufacturing', 
  'Market', 'Markets', 'Material', 'Mathematics', 'Medical', 'Methods', 
  'Metrics', 'Microcontrollers', 'Modeling', 'Models', 'MongoDB', 'NLP', 
  'Negotiation', 'Network', 'Networks', 'Node.js', 'Nuclear', 'Operations', 
  'Optimization', 'Options', 'PCB', 'PLC', 'Patient', 'Pharmacy', 'Planning', 
  'Portfolio', 'Power', 'Process', 'Processing', 'Program', 'Programming', 
  'Project', 'Propulsion', 'Protection', 'Protocol', 'Protocols', 'PyTorch', 
  'Python', 'QMS', 'Quality', 'R', 'RF', 'ROS', 'RTOS', 'Radiation', 'React', 
  'Real', 'Records', 'Regulations', 'Regulatory', 'Relations', 'Relationship', 
  'Research', 'Reservoir', 'Risk', 'SAS', 'SCADA', 'SQL', 'Safety', 'Sales', 
  'Scale-up', 'Science', 'Scientific', 'Semiconductor', 'Sigma', 'Signal', 
  'Six', 'Software', 'SolidWorks', 'Standards', 'Startup', 'Statistical', 
  'Strategic', 'Strategies', 'Strategy', 'Structural', 'Sustainability', 
  'System', 'Systems', 'Tableau', 'Teaching', 'Team', 'Telehealth', 
  'TensorFlow', 'Terminal', 'Testing', 'Theory', 'Trading', 'Trial', 'Trials', 
  'Tunnel', 'VaR', 'Valuation', 'Verilog', 'Vision', 'Waste', 'Well', 'Wind', 
  'Wireless', 'Workflows', 'Writing', 'Yield'
].sort();

const LearningTree = () => {
  // State management
  const [selectedPath, setSelectedPath] = useState<CareerPath | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [careerPaths, setCareerPaths] = useState<CareerPath[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableSkills, setAvailableSkills] = useState<string[]>([]);
  const [skillCategories, setSkillCategories] = useState<SkillCategories>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Fetch available skills with categories
  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const response = await axios.get('/api/ml/available-skills');
        setSkillCategories(response.data.categories);
        setAvailableSkills(response.data.all_skills);
      } catch (error) {
        console.error('Error fetching skills:', error);
      }
    };
    fetchSkills();
  }, []);

  // Filter skills based on search and category
  const filteredSkills = availableSkills.filter(skill => {
    const matchesSearch = skill.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || 
      Object.entries(skillCategories).some(([category, skills]) => 
        category === selectedCategory && skills.includes(skill)
      );
    return matchesSearch && matchesCategory;
  });

  // Skill selection handler
  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev => 
      prev.includes(skill) 
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  // Career recommendations fetch
  const fetchCareerRecommendations = async () => {
    if (selectedSkills.length === 0) {
      setError('Please select at least one skill');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/ml/career-recommendations', 
        { skills: selectedSkills },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }
      );

      // Log the response to see what we're getting
      console.log('API Response:', response.data);

      const paths: CareerPath[] = response.data.map((career: any) => ({
        title: career.title,  // Changed from job_role to title
        category: career.category,
        match: career.match,  // Changed from similarity_score to match
        description: career.description,
        missingSkills: Array.isArray(career.missing_skills) 
          ? career.missing_skills 
          : [],
        skills: selectedSkills.map(skill => ({
          name: skill,
          progress: 100,
          status: 'completed' as const,
          category: career.category
        }))
      }));

      console.log('Transformed paths:', paths);
      
      setCareerPaths(paths);
      setSelectedPath(paths[0] || null);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      setError('Failed to fetch career recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto space-y-8"
      >
        {/* Header Section */}
        <motion.div 
          className="bg-secondary rounded-2xl p-8 shadow-glow"
          variants={itemVariants}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary-light rounded-xl">
              <FiTarget className="h-8 w-8 text-accent" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold text-white mb-2">
                Career Compass
              </h1>
              <p className="text-gray-400">
                Discover your ideal career path using AI-powered skill analysis
              </p>
            </div>
          </div>
        </motion.div>

        {/* Category Selection */}
        <motion.div 
          className="bg-secondary rounded-2xl p-8 shadow-soft mb-8"
          variants={itemVariants}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary-light rounded-xl">
              <FiBookmark className="h-5 w-5 text-accent" />
            </div>
            <h2 className="text-xl font-display font-bold text-white">
              Skill Categories
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('All')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 
                ${selectedCategory === 'All'
                  ? 'bg-accent text-white shadow-glow'
                  : 'bg-primary-light text-gray-400 hover:text-white'
                }`}
            >
              All Skills
            </button>
            {Object.keys(skillCategories).map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 
                  ${selectedCategory === category
                    ? 'bg-accent text-white shadow-glow'
                    : 'bg-primary-light text-gray-400 hover:text-white'
                  }`}
              >
                {category}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Skills Selection Section */}
        <motion.div 
          className="bg-secondary rounded-2xl p-8 shadow-soft"
          variants={itemVariants}
        >
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary-light rounded-xl">
                <FiSearch className="h-5 w-5 text-accent" />
              </div>
              <h2 className="text-xl font-display font-bold text-white">Select Your Skills</h2>
            </div>
            <div className="relative mb-6">
              <input
                type="text"
                placeholder="Search skills..."
                className="w-full bg-primary-light text-white rounded-xl px-5 py-3 
                         focus:outline-none focus:ring-2 focus:ring-accent transition-all
                         placeholder-gray-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2 mb-8">
              {filteredSkills.map((skill) => (
                <motion.button
                  key={skill}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => toggleSkill(skill)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 
                    ${selectedSkills.includes(skill)
                      ? 'bg-accent text-white shadow-glow'
                      : 'bg-primary-light text-gray-400 hover:text-white'
                    }`}
                >
                  {selectedSkills.includes(skill) && (
                    <FiCheck className="inline-block mr-1" />
                  )}
                  {skill}
                </motion.button>
              ))}
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={fetchCareerRecommendations}
              disabled={loading || selectedSkills.length === 0}
              className="w-full bg-accent hover:bg-accent-dark text-white rounded-xl px-6 py-4 
                       font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all 
                       duration-200 shadow-glow flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  <span>Analyzing Your Skills...</span>
                </>
              ) : (
                <>
                  <FiCpu className="h-5 w-5" />
                  <span>Analyze Career Paths</span>
                </>
              )}
            </motion.button>
            {error && (
              <p className="mt-4 text-error text-sm flex items-center gap-2">
                <FiStar className="h-4 w-4" />
                {error}
              </p>
            )}
          </div>
        </motion.div>

        {/* Results Section */}
        <AnimatePresence>
          {careerPaths.length > 0 && (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {/* Career Paths List */}
              <div className="lg:col-span-1 space-y-4">
                {careerPaths.map((path) => (
                  <motion.div
                    key={path.title}
                    variants={itemVariants}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setSelectedPath(path)}
                    className={`cursor-pointer bg-secondary rounded-xl p-6 shadow-soft
                              transition-all duration-200
                              ${selectedPath?.title === path.title 
                                ? 'ring-2 ring-accent shadow-glow' 
                                : 'hover:bg-primary-light'}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2 bg-primary-light rounded-xl">
                        <FiBriefcase className="h-5 w-5 text-accent" />
                      </div>
                      <div className="flex items-center gap-2 bg-primary-light rounded-full px-3 py-1">
                        <FiAward className="h-4 w-4 text-accent" />
                        <span className="text-sm font-medium text-accent">
                          {Math.round(path.match)}% Match
                        </span>
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {path.title}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      {path.description}
                    </p>
                  </motion.div>
                ))}
              </div>

              {/* Skills Detail */}
              {selectedPath && (
                <motion.div
                  variants={itemVariants}
                  className="lg:col-span-2"
                >
                  <div className="bg-secondary rounded-2xl p-8 shadow-soft">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h2 className="text-2xl font-display font-bold text-white mb-2">
                          {selectedPath.title}
                        </h2>
                        <p className="text-gray-400">
                          Career Path Analysis
                        </p>
                      </div>
                      <div className="bg-primary-light rounded-xl px-4 py-2">
                        <span className="text-lg font-semibold text-accent">
                          {Math.round(selectedPath.match)}% Match
                        </span>
                      </div>
                    </div>

                    {/* Current Skills */}
                    <div className="mb-8">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-primary-light rounded-xl">
                          <FiCheck className="h-5 w-5 text-success" />
                        </div>
                        <h3 className="text-xl font-display font-bold text-white">
                          Your Skills
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedPath.skills.map((skill) => (
                          <div
                            key={skill.name}
                            className="flex items-center bg-primary-light rounded-xl p-4"
                          >
                            <div className="p-2 bg-success/20 rounded-lg mr-3">
                              <FiCheck className="h-4 w-4 text-success" />
                            </div>
                            <span className="text-white">{skill.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Missing Skills */}
                    {selectedPath.missingSkills.length > 0 && (
                      <div>
                        <div className="flex items-center gap-3 mb-6">
                          <div className="p-2 bg-primary-light rounded-xl">
                            <FiStar className="h-5 w-5 text-accent" />
                          </div>
                          <h3 className="text-xl font-display font-bold text-white">
                            Recommended Skills
                          </h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedPath.missingSkills.map((skill) => (
                            <div
                              key={skill}
                              className="flex items-center bg-primary-light rounded-xl p-4"
                            >
                              <div className="p-2 bg-accent/20 rounded-lg mr-3">
                                <FiStar className="h-4 w-4 text-accent" />
                              </div>
                              <span className="text-white">{skill}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default LearningTree; 