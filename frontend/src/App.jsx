import React, { useState, useEffect, useRef } from 'react'
import { Plus, ChevronLeft, Trash2, Copy, Check, Pencil, Download, RefreshCw, AlertTriangle, X } from 'lucide-react'

// --- React Error Boundary ---
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-base text-text p-6 flex flex-col justify-center items-center text-center">
          <div className="bg-surface0 border border-red/40 p-6 rounded-2xl max-w-sm w-full space-y-4 shadow-lg">
            <AlertTriangle className="text-red mx-auto" size={40} />
            <h2 className="text-xl font-bold text-red">Произошла ошибка</h2>
            <p className="text-sm text-subtext0 leading-relaxed">
              Интерфейс столкнулся с неожиданным сбоем. Ваши данные в безопасности.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.reload()
              }}
              className="w-full py-3 bg-lavender text-crust font-semibold rounded-xl active:scale-95 transition-all"
            >
              Перезагрузить страницу
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// --- Helper Functions ---
const parseNum = (val, defaultVal = 0) => {
  if (val === undefined || val === null || val === '') return defaultVal
  if (typeof val === 'number') return isNaN(val) ? defaultVal : val
  const cleaned = String(val).replace(',', '.').trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? defaultVal : num
}

const STORAGE_KEYS = {
  CACHE: 'recipe_app_cache_recipes',
  DRAFT: 'recipe_app_create_draft'
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  )
}

function MainApp() {
  const [recipes, setRecipes] = useState([])
  const [view, setView] = useState('list') // 'list', 'detail', 'create', 'edit'
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [networkError, setNetworkError] = useState(false)
  
  // Custom Toast state
  const [toast, setToast] = useState(null) // { message, type: 'error' | 'success' | 'info' }

  // Custom Confirmation Dialog state
  const [confirmModal, setConfirmModal] = useState(null) // { title, message, confirmText, isDanger, onConfirm }

  const showToast = (message, type = 'info', duration = 3500) => {
    setToast({ message, type })
    if (duration > 0) {
      setTimeout(() => {
        setToast(current => (current?.message === message ? null : current))
      }, duration)
    }
  }

  useEffect(() => {
    // Load cached recipes first for instant response
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.CACHE)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecipes(parsed)
        }
      }
    } catch (e) {
      console.warn("Failed to load cached recipes", e)
    }
    fetchRecipes()
  }, [])

  const fetchRecipes = async () => {
    setLoading(true)
    setNetworkError(false)
    try {
      const res = await fetch('/api/recipes')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setRecipes(data)
      try {
        localStorage.setItem(STORAGE_KEYS.CACHE, JSON.stringify(data))
      } catch (err) {
        console.warn("Failed to cache recipes", err)
      }
    } catch (e) {
      console.error(e)
      setNetworkError(true)
      showToast("Не удалось подключиться к серверу. Показаны сохраненные рецепты.", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRecipe = (recipe) => {
    setConfirmModal({
      title: "Удалить рецепт?",
      message: `Вы уверены, что хотите безвозвратно удалить рецепт «${recipe.title}»?`,
      confirmText: "Удалить",
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal(null)
        try {
          const res = await fetch(`/api/recipes/${recipe.id}`, { method: 'DELETE' })
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          showToast("Рецепт успешно удален", "success")
          fetchRecipes()
          setView('list')
        } catch (e) {
          showToast(`Ошибка удаления: ${e.message}`, "error")
        }
      }
    })
  }

  const openRecipe = (r) => {
    setSelectedRecipe(r)
    setView('detail')
  }

  const exportBackup = async () => {
    try {
      const res = await fetch('/api/backup/export')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const dateStr = new Date().toISOString().slice(0, 10)
      a.href = url
      a.download = `recipes_backup_${dateStr}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      showToast("Резервная копия скачана на устройство", "success")
    } catch (e) {
      showToast(`Сбой экспорта: ${e.message}`, "error")
    }
  }

  return (
    <div className="min-h-screen bg-base text-text pb-10 relative">
      {/* Toast Notification Banner */}
      {toast && (
        <div className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto animate-in fade-in slide-in-from-top-4 duration-200">
          <div className={`p-3.5 rounded-xl shadow-xl flex items-center justify-between gap-3 border ${
            toast.type === 'error'
              ? 'bg-surface0 border-red/60 text-red'
              : toast.type === 'success'
              ? 'bg-surface0 border-green/60 text-green'
              : 'bg-surface0 border-lavender/60 text-text'
          }`}>
            <span className="text-sm font-medium leading-snug">{toast.message}</span>
            <button onClick={() => setToast(null)} className="p-1 hover:opacity-70 transition-opacity">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-crust/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-surface0 border border-surface1 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-text">{confirmModal.title}</h3>
            <p className="text-sm text-subtext0 leading-relaxed">{confirmModal.message}</p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-2.5 rounded-xl bg-mantle hover:bg-surface1 text-text text-sm font-medium transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className={`flex-1 py-2.5 rounded-xl text-crust text-sm font-bold transition-transform active:scale-95 ${
                  confirmModal.isDanger ? 'bg-red hover:bg-red/90' : 'bg-green hover:bg-green/90'
                }`}
              >
                {confirmModal.confirmText || 'Продолжить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {view === 'list' && (
        <RecipeList 
          recipes={recipes}
          loading={loading}
          networkError={networkError}
          onRetry={fetchRecipes}
          onOpen={openRecipe} 
          onCreate={() => setView('create')} 
          onExport={exportBackup}
        />
      )}

      {view === 'detail' && selectedRecipe && (
        <RecipeDetail 
          recipe={selectedRecipe} 
          onBack={() => setView('list')} 
          onDelete={() => handleDeleteRecipe(selectedRecipe)}
          onEdit={() => setView('edit')}
          onUpdate={(updated) => {
            setSelectedRecipe(updated)
            fetchRecipes()
          }}
          showToast={showToast}
        />
      )}

      {view === 'create' && (
        <RecipeForm 
          mode="create"
          onBack={() => setView('list')} 
          onSave={() => { setView('list'); fetchRecipes(); }} 
          showToast={showToast}
          setConfirmModal={setConfirmModal}
        />
      )}

      {view === 'edit' && selectedRecipe && (
        <RecipeForm 
          mode="edit"
          initialData={selectedRecipe}
          onBack={() => setView('detail')} 
          onSave={(updated) => {
            setSelectedRecipe(updated)
            setView('detail')
            fetchRecipes()
          }} 
          showToast={showToast}
          setConfirmModal={setConfirmModal}
        />
      )}
    </div>
  )
}

function RecipeList({ recipes, loading, networkError, onRetry, onOpen, onCreate, onExport }) {
  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="flex justify-between items-center mb-6 mt-4">
        <h1 className="text-3xl font-bold">Мои Рецепты</h1>
        <div className="flex items-center gap-2">
          {recipes.length > 0 && (
            <button 
              onClick={onExport} 
              className="p-2.5 bg-surface0 rounded-xl text-subtext0 hover:text-lavender hover:bg-mantle active:scale-95 transition-all"
              title="Скачать резервную копию всех рецептов"
            >
              <Download size={20} />
            </button>
          )}
          <button 
            onClick={onCreate} 
            className="p-2.5 bg-surface0 rounded-xl text-lavender hover:bg-mantle active:scale-95 transition-all"
            title="Добавить рецепт"
          >
            <Plus size={22} />
          </button>
        </div>
      </div>

      {/* Network Alert Banner */}
      {networkError && (
        <div className="mb-4 p-3 bg-surface0 border border-peach/50 rounded-xl flex items-center justify-between gap-2 text-peach">
          <div className="flex items-center gap-2 text-xs font-medium">
            <AlertTriangle size={16} className="flex-shrink-0" />
            <span>Нет связи с сервером. Показаны сохраненные рецепты.</span>
          </div>
          <button 
            onClick={onRetry} 
            className="p-1.5 bg-mantle hover:bg-surface1 rounded-lg text-text text-xs flex items-center gap-1 flex-shrink-0"
          >
            <RefreshCw size={12} />
            <span>Повтор</span>
          </button>
        </div>
      )}

      {loading && recipes.length === 0 && (
        <div className="space-y-3 pt-4">
          <div className="h-16 bg-surface0/60 animate-pulse rounded-2xl"></div>
          <div className="h-16 bg-surface0/60 animate-pulse rounded-2xl"></div>
        </div>
      )}

      {!loading && recipes.length === 0 && !networkError && (
        <div className="text-center py-16 space-y-3">
          <p className="text-subtext0 text-base">У вас пока нет рецептов</p>
          <button 
            onClick={onCreate}
            className="px-4 py-2 bg-surface0 text-lavender rounded-xl text-sm font-medium hover:bg-mantle transition-colors"
          >
            + Создать первый рецепт
          </button>
        </div>
      )}

      <div className="space-y-3">
        {recipes.map(r => (
          <div 
            key={r.id} 
            onClick={() => onOpen(r)}
            className="p-5 bg-surface0 rounded-2xl flex justify-between items-center cursor-pointer border border-transparent hover:border-surface1 active:scale-[0.98] transition-transform"
          >
            <h2 className="text-xl font-medium">{r.title}</h2>
          </div>
        ))}
      </div>
    </div>
  )
}

function RecipeDetail({ recipe, onBack, onDelete, onEdit, onUpdate, showToast }) {
  const [copied, setCopied] = useState(false)
  const [portion, setPortion] = useState(100)
  const [isEditingSteps, setIsEditingSteps] = useState(false)
  const [steps, setSteps] = useState(recipe.steps || [])
  const [savingSteps, setSavingSteps] = useState(false)

  useEffect(() => {
    setSteps(recipe.steps || [])
    setIsEditingSteps(false)
  }, [recipe])

  // Calculate Macros safely
  let totalKcal = 0, totalP = 0, totalF = 0, totalC = 0;
  const ingredientsList = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  
  ingredientsList.forEach(i => {
    const unit = i.unit || 'g';
    const amount = Number(i.amount) || 0;
    const factor = unit === 'g' ? amount / 100 : amount;
    totalKcal += (Number(i.calories_per_100g) || 0) * factor;
    totalP += (Number(i.protein_per_100g) || 0) * factor;
    totalF += (Number(i.fat_per_100g) || 0) * factor;
    totalC += (Number(i.carbs_per_100g) || 0) * factor;
  })

  const finalWeightSafe = Number(recipe.final_weight) > 0 ? Number(recipe.final_weight) : 1;
  const portionSafe = Number(portion) >= 0 ? Number(portion) : 0;
  const factor = portionSafe / finalWeightSafe;

  const mKcal = Math.round(totalKcal * factor);
  const mP = (totalP * factor).toFixed(1);
  const mF = (totalF * factor).toFixed(1);
  const mC = (totalC * factor).toFixed(1);

  const yazioText = `${recipe.title} ${portionSafe}г: ${mKcal} ккал (Б:${mP} Ж:${mF} У:${mC})`;

  const handleCopy = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(yazioText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      showToast("КБЖУ скопировано для Yazio!", "success", 2000)
    } else {
      showToast("Буфер обмена недоступен", "error")
    }
  }

  const handleSaveSteps = async () => {
    setSavingSteps(true)
    try {
      const cleanSteps = steps.map(s => s.trim()).filter(s => s !== '')
      const res = await fetch(`/api/recipes/${recipe.id}/steps`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps: cleanSteps })
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `HTTP ${res.status}`)
      }

      const updated = await res.json()
      setSteps(updated.steps)
      setIsEditingSteps(false)
      showToast("Шаги приготовления сохранены", "success")
      if (onUpdate) onUpdate(updated)
    } catch (e) {
      console.error(e)
      showToast(`Ошибка сохранения: ${e.message}`, "error", 5000)
      // We purposefully keep isEditingSteps = true so user doesn't lose their typed text!
    } finally {
      setSavingSteps(false)
    }
  }

  const handleCancelSteps = () => {
    setSteps(recipe.steps || [])
    setIsEditingSteps(false)
  }

  return (
    <div className="p-4 max-w-md mx-auto pb-10">
      <div className="flex justify-between items-center mb-6 mt-4">
        <button onClick={onBack} className="p-2 -ml-2 text-lavender hover:opacity-80 transition-opacity">
          <ChevronLeft size={28} />
        </button>
        <div className="flex items-center gap-2">
          <button 
            onClick={onEdit} 
            className="p-2 text-subtext0 hover:text-lavender transition-colors"
            title="Редактировать рецепт полностью"
          >
            <Pencil size={20} />
          </button>
          <button 
            onClick={onDelete} 
            className="p-2 text-red hover:opacity-80 transition-opacity"
            title="Удалить рецепт"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      <h1 className="text-3xl font-bold mb-8">{recipe.title}</h1>

      <h2 className="text-xl font-semibold mb-3 text-lavender">Ингредиенты</h2>
      <div className="bg-surface0 rounded-2xl p-4 mb-8 space-y-2">
        {ingredientsList.length === 0 ? (
          <p className="text-subtext0 text-sm">Ингредиенты не указаны</p>
        ) : (
          ingredientsList.map((i, idx) => (
            <div key={idx} className="flex justify-between border-b border-mantle last:border-0 pb-2 last:pb-0 pt-2 first:pt-0">
              <span className="text-text">{i.name}</span>
              <span className="text-subtext0">{i.amount} {i.unit === 'pcs' ? 'шт' : 'г'}</span>
            </div>
          ))
        )}
      </div>

      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-semibold text-lavender">Приготовление</h2>
        {!isEditingSteps ? (
          <button 
            onClick={() => setIsEditingSteps(true)}
            className="flex items-center gap-1.5 text-xs text-lavender bg-surface0 hover:bg-mantle px-2.5 py-1.5 rounded-lg active:scale-95 transition-all"
          >
            <Pencil size={14} />
            <span>Изменить</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button 
              onClick={handleCancelSteps}
              className="text-xs text-subtext0 hover:text-text px-2 py-1 rounded-lg"
              disabled={savingSteps}
            >
              Отмена
            </button>
            <button 
              onClick={handleSaveSteps}
              disabled={savingSteps}
              className="flex items-center gap-1 text-xs font-semibold text-crust bg-green px-3 py-1.5 rounded-lg active:scale-95 transition-all disabled:opacity-50"
            >
              <Check size={14} />
              <span>{savingSteps ? '...' : 'Сохранить'}</span>
            </button>
          </div>
        )}
      </div>

      <div className="bg-surface0 rounded-2xl p-4 mb-8 space-y-3">
        {!isEditingSteps ? (
          steps.length === 0 ? (
            <p className="text-subtext0 text-sm">Шаги приготовления не указаны</p>
          ) : (
            steps.map((s, idx) => (
              <div key={idx} className="flex gap-3">
                <span className="text-peach font-bold">{idx + 1}.</span>
                <span className="text-text leading-relaxed whitespace-pre-wrap">{s}</span>
              </div>
            ))
          )
        ) : (
          <>
            {steps.map((s, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <span className="text-peach font-bold pt-2">{idx + 1}.</span>
                <textarea
                  className="w-full bg-mantle text-text p-3 rounded-xl outline-none min-h-[80px] text-sm resize-y focus:ring-1 focus:ring-lavender leading-relaxed"
                  rows={3}
                  value={s}
                  ref={el => {
                    if (el) {
                      el.style.height = 'auto'
                      el.style.height = `${Math.max(80, el.scrollHeight)}px`
                    }
                  }}
                  onInput={e => {
                    e.target.style.height = 'auto'
                    e.target.style.height = `${Math.max(80, e.target.scrollHeight)}px`
                  }}
                  onChange={e => {
                    const newSteps = [...steps]
                    newSteps[idx] = e.target.value
                    setSteps(newSteps)
                  }}
                  placeholder={`Шаг ${idx + 1}`}
                />
                <button
                  onClick={() => setSteps(steps.filter((_, i) => i !== idx))}
                  className="text-red p-2 hover:opacity-80 active:scale-90 transition-all flex-shrink-0"
                  title="Удалить шаг"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button
              onClick={() => setSteps([...steps, ''])}
              className="w-full py-2 border border-mantle rounded-xl text-subtext0 hover:text-text hover:bg-mantle text-sm transition-colors"
            >
              + Добавить шаг
            </button>
          </>
        )}
      </div>

      <h2 className="text-xl font-semibold mb-3 text-lavender">Калькулятор КБЖУ</h2>
      <div className="bg-surface0 rounded-2xl p-4 mb-6">
        <div className="flex items-center justify-between mb-6 bg-mantle p-3 rounded-xl">
          <span className="text-text font-medium">Вес вашей порции:</span>
          <div className="flex items-center gap-2">
            <input 
              type="text" 
              inputMode="decimal"
              className="bg-surface0 text-text p-2 rounded-lg outline-none w-20 text-center font-bold"
              value={portion}
              onChange={e => setPortion(e.target.value)}
            />
            <span className="text-subtext0">г</span>
          </div>
        </div>

        <div className="flex justify-between mb-6">
          <div className="text-center"><div className="text-xl font-bold text-text">{mKcal}</div><div className="text-xs text-subtext0">Ккал</div></div>
          <div className="text-center"><div className="text-xl font-bold text-green">{mP}</div><div className="text-xs text-subtext0">Белки</div></div>
          <div className="text-center"><div className="text-xl font-bold text-peach">{mF}</div><div className="text-xs text-subtext0">Жиры</div></div>
          <div className="text-center"><div className="text-xl font-bold text-lavender">{mC}</div><div className="text-xs text-subtext0">Углеводы</div></div>
        </div>
        
        <div className="p-3 bg-mantle rounded-xl flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform" onClick={handleCopy}>
          <span className="text-sm font-mono text-subtext0 break-all pr-2">{yazioText}</span>
          {copied ? <Check size={20} className="text-green flex-shrink-0" /> : <Copy size={20} className="text-lavender flex-shrink-0" />}
        </div>
      </div>
    </div>
  )
}

function RecipeForm({ mode = 'create', initialData = null, onBack, onSave, showToast, setConfirmModal }) {
  const [title, setTitle] = useState(initialData?.title || '')
  const [finalWeight, setFinalWeight] = useState(initialData?.final_weight ? String(initialData.final_weight) : '')
  const [ingredients, setIngredients] = useState(() => {
    if (initialData?.ingredients && initialData.ingredients.length > 0) {
      return initialData.ingredients.map(i => ({
        name: i.name || '',
        amount: String(i.amount ?? ''),
        unit: i.unit || 'g',
        calories_per_100g: String(i.calories_per_100g ?? ''),
        protein_per_100g: String(i.protein_per_100g ?? ''),
        fat_per_100g: String(i.fat_per_100g ?? ''),
        carbs_per_100g: String(i.carbs_per_100g ?? ''),
      }))
    }
    return [{ name: '', amount: '', unit: 'g', calories_per_100g: '', protein_per_100g: '', fat_per_100g: '', carbs_per_100g: '' }]
  })
  const [steps, setSteps] = useState(initialData?.steps && initialData.steps.length > 0 ? initialData.steps : [''])
  const [saving, setSaving] = useState(false)
  const [draftRestored, setDraftRestored] = useState(false)

  // Auto-restore draft in 'create' mode
  useEffect(() => {
    if (mode === 'create') {
      try {
        const savedDraft = localStorage.getItem(STORAGE_KEYS.DRAFT)
        if (savedDraft) {
          const draft = JSON.parse(savedDraft)
          if (draft && (draft.title || draft.finalWeight || (draft.ingredients && draft.ingredients.some(i => i.name)))) {
            setTitle(draft.title || '')
            setFinalWeight(draft.finalWeight || '')
            if (Array.isArray(draft.ingredients) && draft.ingredients.length > 0) {
              setIngredients(draft.ingredients)
            }
            if (Array.isArray(draft.steps) && draft.steps.length > 0) {
              setSteps(draft.steps)
            }
            setDraftRestored(true)
          }
        }
      } catch (err) {
        console.warn("Could not parse draft", err)
      }
    }
  }, [mode])

  // Auto-save draft in 'create' mode
  useEffect(() => {
    if (mode === 'create') {
      const isDirty = title.trim() || finalWeight || ingredients.some(i => i.name.trim()) || steps.some(s => s.trim())
      if (isDirty) {
        const draft = { title, finalWeight, ingredients, steps }
        try {
          localStorage.setItem(STORAGE_KEYS.DRAFT, JSON.stringify(draft))
        } catch (e) {
          console.warn("Failed to save draft", e)
        }
      }
    }
  }, [mode, title, finalWeight, ingredients, steps])

  const clearDraft = () => {
    localStorage.removeItem(STORAGE_KEYS.DRAFT)
    setTitle('')
    setFinalWeight('')
    setIngredients([{ name: '', amount: '', unit: 'g', calories_per_100g: '', protein_per_100g: '', fat_per_100g: '', carbs_per_100g: '' }])
    setSteps([''])
    setDraftRestored(false)
    showToast("Черновик очищен", "info")
  }

  const handleBackGuard = () => {
    const isDirty = title.trim() || finalWeight || ingredients.some(i => i.name.trim()) || steps.some(s => s.trim())
    if (isDirty) {
      setConfirmModal({
        title: "Несохраненные изменения",
        message: mode === 'create' 
          ? "Выйти из формы? Ваш черновик будет сохранен на устройстве, и вы сможете вернуться к нему позже."
          : "Выйти без сохранения изменений?",
        confirmText: "Выйти",
        isDanger: false,
        onConfirm: () => {
          setConfirmModal(null)
          onBack()
        }
      })
    } else {
      onBack()
    }
  }

  const save = async () => {
    if (!title.trim()) {
      showToast('Пожалуйста, введите название блюда', 'error')
      return
    }

    const validIngredients = ingredients
      .filter(i => i.name.trim() !== '')
      .map(i => ({
        name: i.name.trim(),
        amount: parseNum(i.amount, 0),
        unit: i.unit || 'g',
        calories_per_100g: parseNum(i.calories_per_100g, 0),
        protein_per_100g: parseNum(i.protein_per_100g, 0),
        fat_per_100g: parseNum(i.fat_per_100g, 0),
        carbs_per_100g: parseNum(i.carbs_per_100g, 0),
      }))

    if (validIngredients.length === 0) {
      showToast('Пожалуйста, укажите хотя бы один ингредиент', 'error')
      return
    }

    const validSteps = steps.map(s => s.trim()).filter(s => s !== '')
    const finalW = parseNum(finalWeight, 0)

    const payload = {
      title: title.trim(),
      final_weight: finalW > 0 ? finalW : 100,
      ingredients: validIngredients,
      steps: validSteps
    }

    setSaving(true)
    try {
      const url = mode === 'create' ? '/api/recipes' : `/api/recipes/${initialData.id}`
      const method = mode === 'create' ? 'POST' : 'PUT'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const msg = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail || 'Не удалось сохранить рецепт')
        throw new Error(msg)
      }

      const savedRecipe = await res.json()

      // Clear draft on successful creation
      if (mode === 'create') {
        localStorage.removeItem(STORAGE_KEYS.DRAFT)
      }

      showToast(mode === 'create' ? "Рецепт успешно создан!" : "Рецепт успешно обновлен!", "success")
      onSave(savedRecipe)
    } catch (e) {
      console.error(e)
      showToast(`Ошибка сохранения: ${e.message}`, "error", 6000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 max-w-md mx-auto pb-20">
      <div className="flex justify-between items-center mb-6 mt-4">
        <button onClick={handleBackGuard} className="p-2 -ml-2 text-lavender hover:opacity-80 transition-opacity">
          <ChevronLeft size={28} />
        </button>
        <h1 className="text-xl font-bold">{mode === 'create' ? 'Новый рецепт' : 'Редактирование'}</h1>
        <div className="w-10"></div>
      </div>

      {draftRestored && mode === 'create' && (
        <div className="mb-4 p-3 bg-surface0 border border-lavender/50 rounded-xl flex items-center justify-between text-xs">
          <span className="text-lavender">Восстановлен несохраненный черновик</span>
          <button 
            onClick={clearDraft} 
            className="text-subtext0 hover:text-red transition-colors underline font-medium"
          >
            Сбросить
          </button>
        </div>
      )}

      <div className="space-y-4">
        <input 
          className="w-full bg-surface0 p-3 rounded-xl outline-none text-lg font-medium focus:ring-1 focus:ring-lavender" 
          placeholder="Название блюда" 
          value={title} 
          onChange={e => setTitle(e.target.value)} 
        />

        <h3 className="font-semibold text-lavender mt-6">Ингредиенты</h3>
        {ingredients.map((ing, idx) => (
          <div key={idx} className="bg-surface0 p-3 rounded-xl space-y-2 border border-transparent focus-within:border-surface1">
            <div className="flex gap-2 items-center">
              <input 
                className="w-full bg-mantle p-2 rounded outline-none" 
                placeholder="Название (напр. Курица)" 
                value={ing.name} 
                onChange={e => {
                  const newI = [...ingredients]
                  newI[idx].name = e.target.value
                  setIngredients(newI)
                }}
              />
              {ingredients.length > 1 && (
                <button
                  type="button"
                  onClick={() => setIngredients(ingredients.filter((_, i) => i !== idx))}
                  className="text-red p-2 hover:opacity-80 active:scale-90 transition-all flex-shrink-0"
                  title="Удалить строку ингредиента"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <input 
                className="w-1/3 bg-mantle p-2 rounded outline-none" 
                type="text" 
                inputMode="decimal" 
                placeholder="Кол-во" 
                value={ing.amount} 
                onChange={e => {
                  const newI = [...ingredients]
                  newI[idx].amount = e.target.value
                  setIngredients(newI)
                }}
              />
              <select 
                className="w-1/3 bg-mantle p-2 rounded outline-none text-sm" 
                value={ing.unit} 
                onChange={e => {
                  const newI = [...ingredients]
                  newI[idx].unit = e.target.value
                  setIngredients(newI)
                }}
              >
                <option value="g">г</option>
                <option value="pcs">шт</option>
              </select>
              <input 
                className="w-1/3 bg-mantle p-2 rounded outline-none text-sm" 
                type="text" 
                inputMode="decimal" 
                placeholder={ing.unit === 'g' ? "Ккал/100г" : "Ккал/1шт"} 
                value={ing.calories_per_100g} 
                onChange={e => {
                  const newI = [...ingredients]
                  newI[idx].calories_per_100g = e.target.value
                  setIngredients(newI)
                }}
              />
            </div>
            <div className="flex gap-2">
              <input 
                className="w-1/3 bg-mantle p-2 rounded outline-none text-sm" 
                type="text" 
                inputMode="decimal" 
                placeholder={ing.unit === 'g' ? "Б (на 100)" : "Б (на 1шт)"} 
                value={ing.protein_per_100g} 
                onChange={e => {
                  const newI = [...ingredients]
                  newI[idx].protein_per_100g = e.target.value
                  setIngredients(newI)
                }}
              />
              <input 
                className="w-1/3 bg-mantle p-2 rounded outline-none text-sm" 
                type="text" 
                inputMode="decimal" 
                placeholder={ing.unit === 'g' ? "Ж (на 100)" : "Ж (на 1шт)"} 
                value={ing.fat_per_100g} 
                onChange={e => {
                  const newI = [...ingredients]
                  newI[idx].fat_per_100g = e.target.value
                  setIngredients(newI)
                }}
              />
              <input 
                className="w-1/3 bg-mantle p-2 rounded outline-none text-sm" 
                type="text" 
                inputMode="decimal" 
                placeholder={ing.unit === 'g' ? "У (на 100)" : "У (на 1шт)"} 
                value={ing.carbs_per_100g} 
                onChange={e => {
                  const newI = [...ingredients]
                  newI[idx].carbs_per_100g = e.target.value
                  setIngredients(newI)
                }}
              />
            </div>
          </div>
        ))}

        <button 
          type="button"
          onClick={() => setIngredients([...ingredients, { name: '', amount: '', unit: 'g', calories_per_100g: '', protein_per_100g: '', fat_per_100g: '', carbs_per_100g: '' }])} 
          className="w-full py-2 border border-surface0 rounded-xl text-subtext0 hover:bg-surface0 transition-colors"
        >
          + Добавить ингредиент
        </button>

        <h3 className="font-semibold text-lavender mt-6">Шаги приготовления</h3>
        {steps.map((s, idx) => (
          <div key={idx} className="flex gap-2 items-start">
            <textarea 
              className="w-full bg-surface0 p-3 rounded-xl outline-none min-h-[80px] resize-y focus:ring-1 focus:ring-lavender leading-relaxed" 
              rows={3}
              placeholder={`Шаг ${idx + 1}`} 
              value={s}
              ref={el => {
                if (el) {
                  el.style.height = 'auto'
                  el.style.height = `${Math.max(80, el.scrollHeight)}px`
                }
              }}
              onInput={e => {
                e.target.style.height = 'auto'
                e.target.style.height = `${Math.max(80, e.target.scrollHeight)}px`
              }}
              onChange={e => {
                const newS = [...steps]
                newS[idx] = e.target.value
                setSteps(newS)
              }} 
            />
            {steps.length > 1 && (
              <button
                type="button"
                onClick={() => setSteps(steps.filter((_, i) => i !== idx))}
                className="text-red p-2 hover:opacity-80 active:scale-90 transition-all flex-shrink-0 mt-2"
                title="Удалить шаг"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}

        <button 
          type="button"
          onClick={() => setSteps([...steps, ''])} 
          className="w-full py-2 border border-surface0 rounded-xl text-subtext0 hover:bg-surface0 transition-colors"
        >
          + Добавить шаг
        </button>

        <h3 className="font-semibold text-lavender mt-6">Итог</h3>
        <input 
          className="w-full bg-surface0 p-3 rounded-xl outline-none focus:ring-1 focus:ring-lavender" 
          type="text"
          inputMode="decimal"
          placeholder="Вес ГОТОВОГО блюда (г)" 
          value={finalWeight} 
          onChange={e => setFinalWeight(e.target.value)} 
        />

        <button 
          onClick={save} 
          disabled={saving}
          className="w-full bg-green text-crust font-bold text-lg py-4 rounded-xl mt-8 mb-8 active:scale-[0.98] transition-transform disabled:opacity-50"
        >
          {saving ? 'Сохранение...' : (mode === 'create' ? 'Сохранить рецепт' : 'Применить изменения')}
        </button>
      </div>
    </div>
  )
}
