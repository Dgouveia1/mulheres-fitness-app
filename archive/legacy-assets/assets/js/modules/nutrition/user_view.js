export const UserNutritionView = {
    Main: (diet) => {
        if (!diet) {
            return `
            <div class="page-content" style="text-align:center; padding-top:60px;">
                <span class="material-icons" style="font-size:4rem; color:#e5e7eb; margin-bottom:16px;">restaurant_menu</span>
                <h3 style="color:#666;">Sem plano alimentar</h3>
                <p style="color:#999; margin-top:8px;">Aguarde sua nutricionista liberar seu cardápio.</p>
            </div>`;
        }

        const firstName = diet.title;

        return `
        <div style="padding-bottom: 80px;">
            <div class="diet-header">
                <h2 style="font-size:1.8rem; margin-bottom:5px;">${diet.title}</h2>
                <p style="opacity:0.9; font-size:0.9rem;">${diet.description || 'Siga o plano corretamente para melhores resultados.'}</p>
            </div>

            <div class="diet-timeline">
                ${diet.meals.map(meal => `
                    <div class="timeline-meal">
                        <div class="timeline-header">
                            <span class="timeline-title">${meal.name}</span>
                            <span class="timeline-time">${meal.time}</span>
                        </div>
                        <div class="timeline-foods">
                            ${meal.foods.length > 0 ? meal.foods.map(food => `
                                <div class="food-check-item">
                                    <div class="food-icon">🍎</div>
                                    <div class="food-details">
                                        <strong>${food.food_item}</strong>
                                        <span>${food.portion}</span>
                                    </div>
                                </div>
                            `).join('') : '<p style="color:#999; font-size:0.8rem;">Sem itens cadastrados.</p>'}
                        </div>
                    </div>
                `).join('')}
                
                <div style="text-align:center; color:#999; font-size:0.8rem; margin-top:20px;">
                    <span class="material-icons" style="font-size:1rem; vertical-align:middle;">water_drop</span> Não esqueça de beber água!
                </div>
            </div>
        </div>
        `;
    }
};