import { useState, useEffect } from 'react'
import { Plus, ChevronLeft, Trash2, Copy, Check, Pencil } from 'lucide-react'

export default function App() {
  const [recipes, setRecipes] = useState([])
  const [view, setView] = useState('list') // 'list', 'detail', 'create'
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  
  useEffect(() => {
    fetchRecipes()
  }, [])

  const fetchRecipes = async () => {
    try {
      const res = await fetch('/api/recipes')
      const data = await res.json()
      setRecipes(data)
    } catch (e) {
      console.error(e)
    }
  }

  const deleteRecipe = async (id) => {
    if(!confirm("Удалить рецепт?")) return;
    await fetch(`/api/recipes/${id}`, { method: 'DELETE' })
    fetchRecipes()
    setView('list')
  }

  const openRecipe = (r) => {
    setSelectedRecipe(r)
    setView('detail')
  }

  return (
    <div className="min-h-screen bg-base text-text pb-10">
      {view === 'list' && (
        <RecipeList 
          recipes={recipes} 
          onOpen={openRecipe} 
          onCreate={() => setView('create')} 
        />
      )}
      {view === 'detail' && (
        <RecipeDetail 
          recipe={selectedRecipe} 
          onBack={() => setView('list')} 
          onDelete={() => deleteRecipe(selectedRecipe.id)}
          onUpdate={(updated) => {
            setSelectedRecipe(updated)
            fetchRecipes()
          }}
        />
      )}
      {view === 'create' && (
        <RecipeCreate 
          onBack={() => setView('list')} 
          onSave={() => { setView('list'); fetchRecipes(); }} 
        />
      )}
    </div>
  )
}

function RecipeList({ recipes, onOpen, onCreate }) {
  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="flex justify-between items-center mb-6 mt-4">
        <h1 className="text-3xl font-bold">Мои Рецепты</h1>
        <button onClick={onCreate} className="p-2 bg-surface0 rounded-xl text-lavender hover:bg-mantle">
          <Plus size={24} />
        </button>
      </div>
      <div className="space-y-3">
        {recipes.length === 0 && <p className="text-subtext0 text-center mt-10">Нет рецептов</p>}
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

function RecipeDetail({ recipe, onBack, onDelete, onUpdate }) {
  const [copied, setCopied] = useState(false)
  const [portion, setPortion] = useState(100)
  const [isEditingSteps, setIsEditingSteps] = useState(false)
  const [steps, setSteps] = useState(recipe.steps || [])
  const [savingSteps, setSavingSteps] = useState(false)

  useEffect(() => {
    setSteps(recipe.steps || [])
    setIsEditingSteps(false)
  }, [recipe])

  // Calculate Macros
  let totalKcal = 0, totalP = 0, totalF = 0, totalC = 0;
  recipe.ingredients.forEach(i => {
    const unit = i.unit || 'g';
    const factor = unit === 'g' ? i.amount / 100 : i.amount;
    totalKcal += i.calories_per_100g * factor;
    totalP += i.protein_per_100g * factor;
    totalF += i.fat_per_100g * factor;
    totalC += i.carbs_per_100g * factor;
  })

  const factor = (portion || 0) / (recipe.final_weight || 1);
  const mKcal = Math.round(totalKcal * factor);
  const mP = (totalP * factor).toFixed(1);
  const mF = (totalF * factor).toFixed(1);
  const mC = (totalC * factor).toFixed(1);

  const yazioText = `${recipe.title} ${portion}г: ${mKcal} ккал (Б:${mP} Ж:${mF} У:${mC})`;

  const handleCopy = () => {
    navigator.clipboard.writeText(yazioText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSaveSteps = async () => {
    setSavingSteps(true)
    try {
      const cleanSteps = steps.filter(s => s.trim() !== '')
      const res = await fetch(`/api/recipes/${recipe.id}/steps`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps: cleanSteps })
      })
      if (res.ok) {
        const updated = await res.json()
        setSteps(updated.steps)
        setIsEditingSteps(false)
        if (onUpdate) onUpdate(updated)
      }
    } catch (e) {
      console.error(e)
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
        <button onClick={onBack} className="p-2 -ml-2 text-lavender">
          <ChevronLeft size={28} />
        </button>
        <button onClick={onDelete} className="p-2 text-red-400">
          <Trash2 size={22} />
        </button>
      </div>

      <h1 className="text-3xl font-bold mb-8">{recipe.title}</h1>

      <h2 className="text-xl font-semibold mb-3 text-lavender">Ингредиенты</h2>
      <div className="bg-surface0 rounded-2xl p-4 mb-8 space-y-2">
        {recipe.ingredients.map((i, idx) => (
          <div key={idx} className="flex justify-between border-b border-mantle last:border-0 pb-2 last:pb-0 pt-2 first:pt-0">
            <span className="text-text">{i.name}</span>
            <span className="text-subtext0">{i.amount} {i.unit === 'pcs' ? 'шт' : 'г'}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-semibold text-lavender">Приготовление</h2>
        {!isEditingSteps ? (
          <button 
            onClick={() => setIsEditingSteps(true)}
            className="flex items-center gap-1.5 text-xs text-subtext0 bg-surface0 hover:bg-mantle px-2.5 py-1.5 rounded-lg active:scale-95 transition-all text-lavender"
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
              className="flex items-center gap-1 text-xs font-semibold text-crust bg-green px-3 py-1.5 rounded-lg active:scale-95 transition-all"
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
                <span className="text-text leading-relaxed">{s}</span>
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
                  className="text-red-400 p-2 hover:text-red-300 active:scale-90 transition-all flex-shrink-0"
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
              type="number" 
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

function RecipeCreate({ onBack, onSave }) {
  const [title, setTitle] = useState('')
  const [finalWeight, setFinalWeight] = useState('')
  const [ingredients, setIngredients] = useState([{ name: '', amount: '', unit: 'g', calories_per_100g: '', protein_per_100g: '', fat_per_100g: '', carbs_per_100g: '' }])
  const [steps, setSteps] = useState([''])

  const save = async () => {
    const payload = {
      title,
      final_weight: parseFloat(finalWeight),
      ingredients: ingredients.map(i => ({
        name: i.name,
        amount: parseFloat(i.amount),
        unit: i.unit,
        calories_per_100g: parseFloat(i.calories_per_100g),
        protein_per_100g: parseFloat(i.protein_per_100g),
        fat_per_100g: parseFloat(i.fat_per_100g),
        carbs_per_100g: parseFloat(i.carbs_per_100g),
      })),
      steps: steps.filter(s => s.trim() !== '')
    }

    await fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    onSave()
  }

  return (
    <div className="p-4 max-w-md mx-auto pb-20">
      <div className="flex justify-between items-center mb-6 mt-4">
        <button onClick={onBack} className="p-2 -ml-2 text-lavender">
          <ChevronLeft size={28} />
        </button>
        <h1 className="text-xl font-bold">Новый рецепт</h1>
        <div className="w-10"></div>
      </div>

      <div className="space-y-4">
        <input 
          className="w-full bg-surface0 p-3 rounded-xl outline-none text-lg font-medium" 
          placeholder="Название блюда" 
          value={title} onChange={e => setTitle(e.target.value)} 
        />

        <h3 className="font-semibold text-lavender mt-6">Ингредиенты</h3>
        {ingredients.map((ing, idx) => (
          <div key={idx} className="bg-surface0 p-3 rounded-xl space-y-2">
            <input className="w-full bg-mantle p-2 rounded outline-none" placeholder="Название (напр. Курица)" value={ing.name} onChange={e => {
              const newI = [...ingredients]; newI[idx].name = e.target.value; setIngredients(newI)
            }}/>
            <div className="flex gap-2">
              <input className="w-1/3 bg-mantle p-2 rounded outline-none" type="number" placeholder="Кол-во" value={ing.amount} onChange={e => {
                const newI = [...ingredients]; newI[idx].amount = e.target.value; setIngredients(newI)
              }}/>
              <select className="w-1/3 bg-mantle p-2 rounded outline-none text-sm" value={ing.unit} onChange={e => {
                const newI = [...ingredients]; newI[idx].unit = e.target.value; setIngredients(newI)
              }}>
                <option value="g">г</option>
                <option value="pcs">шт</option>
              </select>
              <input className="w-1/3 bg-mantle p-2 rounded outline-none text-sm" type="number" placeholder={ing.unit === 'g' ? "Ккал/100г" : "Ккал/1шт"} value={ing.calories_per_100g} onChange={e => {
                const newI = [...ingredients]; newI[idx].calories_per_100g = e.target.value; setIngredients(newI)
              }}/>
            </div>
            <div className="flex gap-2">
              <input className="w-1/3 bg-mantle p-2 rounded outline-none text-sm" type="number" placeholder={ing.unit === 'g' ? "Б (на 100)" : "Б (на 1шт)"} value={ing.protein_per_100g} onChange={e => {
                const newI = [...ingredients]; newI[idx].protein_per_100g = e.target.value; setIngredients(newI)
              }}/>
              <input className="w-1/3 bg-mantle p-2 rounded outline-none text-sm" type="number" placeholder={ing.unit === 'g' ? "Ж (на 100)" : "Ж (на 1шт)"} value={ing.fat_per_100g} onChange={e => {
                const newI = [...ingredients]; newI[idx].fat_per_100g = e.target.value; setIngredients(newI)
              }}/>
              <input className="w-1/3 bg-mantle p-2 rounded outline-none text-sm" type="number" placeholder={ing.unit === 'g' ? "У (на 100)" : "У (на 1шт)"} value={ing.carbs_per_100g} onChange={e => {
                const newI = [...ingredients]; newI[idx].carbs_per_100g = e.target.value; setIngredients(newI)
              }}/>
            </div>
          </div>
        ))}
        <button onClick={() => setIngredients([...ingredients, { name: '', amount: '', unit: 'g', calories_per_100g: '', protein_per_100g: '', fat_per_100g: '', carbs_per_100g: '' }])} className="w-full py-2 border border-surface0 rounded-xl text-subtext0 hover:bg-surface0 transition-colors">
          + Добавить ингредиент
        </button>

        <h3 className="font-semibold text-lavender mt-6">Шаги приготовления</h3>
        {steps.map((s, idx) => (
          <textarea 
            key={idx}
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
              const newS = [...steps]; newS[idx] = e.target.value; setSteps(newS)
            }} 
          />
        ))}
        <button onClick={() => setSteps([...steps, ''])} className="w-full py-2 border border-surface0 rounded-xl text-subtext0 hover:bg-surface0 transition-colors">
          + Добавить шаг
        </button>

        <h3 className="font-semibold text-lavender mt-6">Итог</h3>
        <input 
          className="w-full bg-surface0 p-3 rounded-xl outline-none" 
          type="number"
          placeholder="Вес ГОТОВОГО блюда (г)" 
          value={finalWeight} onChange={e => setFinalWeight(e.target.value)} 
        />

        <button onClick={save} className="w-full bg-green text-crust font-bold text-lg py-4 rounded-xl mt-8 mb-8 active:scale-[0.98] transition-transform">
          Сохранить рецепт
        </button>
      </div>
    </div>
  )
}
