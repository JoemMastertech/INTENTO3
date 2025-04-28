// Order System for Master Technology Bar
import ProductData from '../../../../Infraestructura/data-providers/product-data.js';

const OrderSystem = {
  orderItems: [],
  currentProduct: null,
  currentCategory: null,
  isOrderMode: false,
  selectedDrinks: [],
  drinkCounts: {}, // Track quantities of selected drinks
  maxDrinkCount: 5, // Default max drink count
  bottleCategory: null, // Track the current bottle category
  selectedCookingTerm: null,

  initialize: function() {
    // Initialize order creation button
    const createOrderBtn = document.getElementById('create-order-btn');
    const completeOrderBtn = document.getElementById('complete-order-btn');
    const cancelOrderBtn = document.getElementById('cancel-order-btn');

    // Display saved orders on initialization
    this.displaySavedOrders();

    // Drink options modal buttons
    const confirmDrinksBtn = document.getElementById('confirm-drinks-btn');
    const cancelDrinksBtn = document.getElementById('cancel-drinks-btn');

    // Food customization modal buttons
    const keepIngredientsBtn = document.getElementById('keep-ingredients-btn');
    const customizeIngredientsBtn = document.getElementById('customize-ingredients-btn');
    const confirmIngredientsBtn = document.getElementById('confirm-ingredients-btn');
    const cancelIngredientsBtn = document.getElementById('cancel-ingredients-btn');

    // Meat customization modal buttons
    const cookingOptions = document.querySelectorAll('.cooking-option');
    const changeGarnishBtn = document.getElementById('change-garnish-btn');
    const keepGarnishBtn = document.getElementById('keep-garnish-btn');
    const confirmGarnishBtn = document.getElementById('confirm-garnish-btn');
    const cancelGarnishBtn = document.getElementById('cancel-garnish-btn');

    // Event listeners for main order buttons
    createOrderBtn.addEventListener('click', () => this.toggleOrderMode());
    completeOrderBtn.addEventListener('click', () => this.completeOrder());
    cancelOrderBtn.addEventListener('click', () => this.cancelOrder());

    // Event listeners for drink options modal
    confirmDrinksBtn.addEventListener('click', () => this.confirmDrinkOptions());
    cancelDrinksBtn.addEventListener('click', () => this.cancelProductSelection());

    // Event listeners for food customization modal
    keepIngredientsBtn.addEventListener('click', () => this.addFoodWithoutCustomization());
    customizeIngredientsBtn.addEventListener('click', () => this.showIngredientsInput());
    confirmIngredientsBtn.addEventListener('click', () => this.confirmIngredientCustomization());
    cancelIngredientsBtn.addEventListener('click', () => this.cancelProductSelection());

    // Event listeners for meat customization modal
    cookingOptions.forEach(option => {
      option.addEventListener('click', (e) => {
        cookingOptions.forEach(opt => opt.classList.remove('selected'));
        e.target.classList.add('selected');
        this.selectedCookingTerm = e.target.getAttribute('data-term');
      });
    });

    changeGarnishBtn.addEventListener('click', () => this.showGarnishInput());
    keepGarnishBtn.addEventListener('click', () => this.addMeatWithoutGarnishChange());
    confirmGarnishBtn.addEventListener('click', () => this.confirmGarnishCustomization());
    cancelGarnishBtn.addEventListener('click', () => this.cancelProductSelection());

    // Listen for price button clicks when in order mode
    document.addEventListener('click', (e) => {
      if (!this.isOrderMode) return;

      if (e.target.classList.contains('price-button')) {
        const row = e.target.closest('tr');
        const nameCell = row.querySelector('.product-name');
        const priceText = e.target.textContent;
        const productName = nameCell.textContent;

        // Determine product type and handle accordingly
        this.handleProductSelection(productName, priceText, row, e);
      }
    });
  },

  toggleOrderMode: function() {
    const createOrderBtn = document.getElementById('create-order-btn');
    const orderSidebar = document.getElementById('order-sidebar');
    const tables = document.querySelectorAll('.product-table, .liquor-table');

    this.isOrderMode = !this.isOrderMode;

    if (this.isOrderMode) {
      createOrderBtn.textContent = 'Cancelar Orden';
      createOrderBtn.classList.add('active');
      orderSidebar.style.display = 'block';
      tables.forEach(table => table.classList.add('price-selection-mode'));
    } else {
      createOrderBtn.textContent = 'Crear Orden';
      createOrderBtn.classList.remove('active');
      orderSidebar.style.display = 'none';
      tables.forEach(table => table.classList.remove('price-selection-mode'));
      this.orderItems = [];
      this.updateOrderDisplay();
    }
  },

  handleProductSelection: function(productName, priceText, row, event) {
    const price = this.extractPrice(priceText);
    
    // Determine which price column was clicked
    const priceType = this.getPriceType(row, event.target);
    
    this.currentProduct = { 
      name: productName, 
      price: price,
      priceType: priceType // Add price type to current product
    };

    // Get current category from page title
    const pageTitle = document.querySelector('.page-title').textContent.trim().toUpperCase();
    this.currentCategory = pageTitle;

    // Determine the type of product and show appropriate modal
    if (this.isBottleProduct(row)) {
      // Determine which price column was clicked
      const priceType = this.getPriceType(row, event.target);
      
      if (priceType === 'precioBotella') {
        this.showDrinkOptionsModal();
      } else if (priceType === 'precioLitro') {
        this.showLiterOptionsModal();
      } else if (priceType === 'precioCopa') {
        this.showCupOptionsModal();
      }
    } else if (this.isFoodProduct()) {
      this.showFoodCustomizationModal();
    } else if (this.isMeatProduct()) {
      this.showMeatCustomizationModal();
    } else {
      // For products without customization options
      this.addProductToOrder({
        name: productName,
        price: price,
        customizations: []
      });
    }
  },

  getPriceType: function(row, clickedElement) {
    // Find which column was clicked based on the header text
    const columnIndex = Array.from(row.cells).findIndex(cell => cell.contains(clickedElement));
    if (columnIndex === -1) return null;
    
    const headers = document.querySelectorAll('th');
    const headerText = headers[columnIndex]?.textContent.trim().toUpperCase() || '';
    
    if (headerText.includes('BOTELLA')) return 'precioBotella';
    if (headerText.includes('LITRO')) return 'precioLitro';
    if (headerText.includes('COPA')) return 'precioCopa';
    
    return null;
  },
  
  isBottleProduct: function(row) {
    // Check if this is a bottle product (has price columns from liquor tables)
    const headers = document.querySelectorAll('th');
    let isBottleProduct = false;

    headers.forEach(header => {
      const headerText = header.textContent.toUpperCase();
      if (headerText.includes('BOTELLA') || headerText.includes('LITRO') || headerText.includes('COPA')) {
        isBottleProduct = true;
      }
    });

    return isBottleProduct && row.querySelector('.product-price');
  },

  isFoodProduct: function() {
    // Check if current category is a food category that needs customization
    const foodCategories = ['PIZZAS', 'ALITAS', 'SOPAS', 'ENSALADAS'];
    return foodCategories.includes(this.currentCategory);
  },

  isMeatProduct: function() {
    return this.currentCategory === 'CARNES';
  },

  showDrinkOptionsModal: function() {
    const modal = document.getElementById('drink-options-modal');
    const optionsContainer = document.getElementById('drink-options-container');

    // Clear previous options
    optionsContainer.innerHTML = '';
    this.selectedDrinks = [];
    this.drinkCounts = {};

    // Determine the bottle category and max drinks
    this.bottleCategory = this.getLiquorType(this.currentProduct.name);
    this.maxDrinkCount = 5; // Default max count

    // Get appropriate options and message based on liquor type
    const { drinkOptions, message } = this.getDrinkOptionsForProduct(this.currentProduct.name);

    // Add message to modal
    const messageElement = document.createElement('p');
    messageElement.className = 'drink-options-message';
    messageElement.textContent = message;
    optionsContainer.appendChild(messageElement);

    // Current total count indicator
    const totalCountContainer = document.createElement('div');
    totalCountContainer.className = 'total-count-container';
    totalCountContainer.innerHTML = `<span>Total seleccionado: <span id="total-drinks-count">0</span> / ${this.maxDrinkCount}</span>`;
    optionsContainer.appendChild(totalCountContainer);

    // Create options with counters
    drinkOptions.forEach(option => {
      if (option === 'Ninguno') {
        const noneOption = document.createElement('button');
        noneOption.className = 'drink-option';
        noneOption.textContent = option;
        noneOption.addEventListener('click', () => {
          // Clear all selections and just use "Ninguno"
          this.selectedDrinks = ['Ninguno'];
          this.drinkCounts = {};

          document.querySelectorAll('.drink-option').forEach(btn => {
            btn.classList.remove('selected');
          });
          noneOption.classList.add('selected');
          document.getElementById('total-drinks-count').textContent = '0';
        });
        optionsContainer.appendChild(noneOption);
        return;
      }

      const optionContainer = document.createElement('div');
      optionContainer.className = 'drink-option-container';

      const optionName = document.createElement('span');
      optionName.className = 'drink-option-name';
      optionName.textContent = option;

      const counterContainer = document.createElement('div');
      counterContainer.className = 'counter-container';

      const decrementBtn = document.createElement('button');
      decrementBtn.className = 'counter-btn';
      decrementBtn.textContent = '-';
      decrementBtn.addEventListener('click', () => {
        const currentCount = this.drinkCounts[option] || 0;
        if (currentCount > 0) {
          this.drinkCounts[option] = currentCount - 1;
          countDisplay.textContent = this.drinkCounts[option];
          if (this.drinkCounts[option] === 0) {
            optionContainer.classList.remove('selected');
            this.selectedDrinks = this.selectedDrinks.filter(drink => drink !== option);
          }
          this.updateTotalDrinkCount();
        }
      });

      const countDisplay = document.createElement('span');
      countDisplay.className = 'count-display';
      countDisplay.textContent = '0';

      const incrementBtn = document.createElement('button');
      incrementBtn.className = 'counter-btn';
      incrementBtn.textContent = '+';
      incrementBtn.addEventListener('click', () => {
        const isJuice = this.isJuiceOption(option);
        const totalCount = this.calculateTotalDrinkCount();
        const currentCount = this.drinkCounts[option] || 0;

        let canIncrement = false;

        if (this.bottleCategory === 'VODKA' || this.bottleCategory === 'GINEBRA') {
          // Special rules for Vodka & Ginebra
          const totalJuices = this.calculateTotalJuiceCount();
          const totalRefrescos = totalCount - totalJuices * 2; // Each juice counts as 2 refrescos

          if (isJuice) {
            // Check if adding one more juice is allowed
            canIncrement = totalJuices < 2 && totalRefrescos + 2 <= 5;
          } else {
            // Check if adding one more refresco is allowed
            const maxRefrescos = totalJuices === 1 ? 2 : (totalJuices === 0 ? 5 : 0);
            canIncrement = totalRefrescos < maxRefrescos;
          }
        } else {
          // Standard rule for other categories
          canIncrement = totalCount < this.maxDrinkCount;
        }

        if (canIncrement) {
          this.drinkCounts[option] = currentCount + 1;
          countDisplay.textContent = this.drinkCounts[option];
          optionContainer.classList.add('selected');
          if (!this.selectedDrinks.includes(option)) {
            this.selectedDrinks.push(option);
          }
          this.updateTotalDrinkCount();
        }
      });

      counterContainer.appendChild(decrementBtn);
      counterContainer.appendChild(countDisplay);
      counterContainer.appendChild(incrementBtn);

      optionContainer.appendChild(optionName);
      optionContainer.appendChild(counterContainer);
      optionsContainer.appendChild(optionContainer);
    });

    modal.style.display = 'flex';
  },

  isJuiceOption: function(option) {
    const juiceOptions = ['Piña', 'Uva', 'Naranja', 'Arándano', 'Mango', 'Durazno'];
    return juiceOptions.includes(option);
  },

  calculateTotalDrinkCount: function() {
    let total = 0;
    const isVodkaOrGin = this.bottleCategory === 'VODKA' || this.bottleCategory === 'GINEBRA';

    for (const [option, count] of Object.entries(this.drinkCounts)) {
      if (isVodkaOrGin && this.isJuiceOption(option)) {
        total += count * 2; // Each juice counts as 2 in the total for Vodka/Ginebra
      } else {
        total += count;
      }
    }

    return total;
  },

  calculateTotalJuiceCount: function() {
    let total = 0;

    for (const [option, count] of Object.entries(this.drinkCounts)) {
      if (this.isJuiceOption(option)) {
        total += count;
      }
    }

    return total;
  },

  updateTotalDrinkCount: function() {
    const totalCountElement = document.getElementById('total-drinks-count');
    const total = this.calculateTotalDrinkCount();
    totalCountElement.textContent = total;

    // Update visual feedback
    const counterBtns = document.querySelectorAll('.counter-btn');
    const isVodkaOrGin = this.bottleCategory === 'VODKA' || this.bottleCategory === 'GINEBRA';

    counterBtns.forEach(btn => {
      if (btn.textContent === '+') {
        const optionContainer = btn.closest('.drink-option-container');
        const optionName = optionContainer.querySelector('.drink-option-name').textContent;
        const isJuice = this.isJuiceOption(optionName);

        if (isVodkaOrGin) {
          const totalJuices = this.calculateTotalJuiceCount();
          const totalRefrescos = total - totalJuices * 2;

          if (isJuice) {
            btn.disabled = totalJuices >= 2 || (totalRefrescos + 2 > 5);
          } else {
            const maxRefrescos = totalJuices === 1 ? 2 : (totalJuices === 0 ? 5 : 0);
            btn.disabled = totalRefrescos >= maxRefrescos;
          }
        } else {
          btn.disabled = total >= this.maxDrinkCount;
        }
      }
    });
  },

  getDrinkOptionsForProduct: function(productName) {
    // Determine product type based on name or current category
    const productType = this.getLiquorType(productName);
    let message = "Puedes elegir 5 refrescos";
    let options = ['Mineral', 'Agua', 'Coca', 'Manzana'];

    // Return specific options based on liquor type
    switch (productType) {
      case 'RON':
        message = "Puedes elegir 5 refrescos";
        options = ['Mineral', 'Coca', 'Manzana'];
        break;
      case 'TEQUILA':
        message = "Puedes elegir 5 refrescos";
        options = ['Mineral', 'Toronja', 'Botella de Agua', 'Coca'];
        break;
      case 'BRANDY':
        message = "Puedes elegir 5 refrescos";
        options = ['Mineral', 'Coca', 'Manzana'];
        break;
      case 'WHISKY':
        message = "Puedes elegir 5 refrescos";
        options = ['Mineral', 'Manzana', 'Ginger ale', 'Botella de Agua'];
        break;
      case 'VODKA':
      case 'GINEBRA':
        message = "Puedes elegir 2 Jarras de jugo ó 5 Refrescos ó 1 Jarra de jugo y 2 Refrescos";
        options = ['Piña', 'Uva', 'Naranja', 'Arándano', 'Mango', 'Durazno', 'Mineral', 'Agua', 'Quina'];
        break;
      case 'MEZCAL':
        message = "Puedes elegir 5 refrescos";
        options = ['Mineral', 'Toronja', 'Botella de Agua', 'Coca'];
        break;
      case 'COGNAC':
        message = "Puedes elegir 5 refrescos";
        options = ['Mineral', 'Coca', 'Manzana', 'Botella de Agua'];
        break;
      case 'ESPUMOSOS':
      case 'DIGESTIVOS':
        message = "Este producto no incluye refrescos";
        options = ['Ninguno'];
        break;
      default:
        message = "Puedes elegir 5 refrescos";
        options = ['Mineral', 'Agua', 'Coca', 'Manzana'];
    }

    return { drinkOptions: options, message };
  },

  confirmDrinkOptions: function() {
    const modal = document.getElementById('drink-options-modal');

    if (this.selectedDrinks.length === 0) {
      alert('Por favor seleccione al menos un acompañamiento');
      return;
    }

    let customizationMessage = '';
    let productPrefix = '';
    let productName = this.currentProduct.name;

    // Check which type of price was selected (bottle, liter, or cup)
    if (this.currentProduct.priceType === 'precioBotella') {
      productPrefix = 'Botella';
    } else if (this.currentProduct.priceType === 'precioLitro') {
      productPrefix = 'Litro';
      // Remove ML references when adding litro
      productName = productName.replace(/\s*\d+\s*ML/i, '');
    } else if (this.currentProduct.priceType === 'precioCopa') {
      productPrefix = 'Copa';
      // Remove ML references when adding copa
      productName = productName.replace(/\s*\d+\s*ML/i, '');
    }

    // Check if we're in the counter mode (bottle) or single selection mode (liter or cup)
    if (Object.keys(this.drinkCounts).length > 0) {
      // Create formatted customization text with counts for bottle mode
      const customizations = [];

      if (this.selectedDrinks.includes('Ninguno')) {
        customizations.push('Sin acompañamientos');
      } else {
        for (const [drink, count] of Object.entries(this.drinkCounts)) {
          if (count > 0) {
            customizations.push(`${count}x ${drink}`);
          }
        }
      }
      customizationMessage = `Con: ${customizations.join(', ')}`;
    } else {
      // Single selection mode for liter or cup
      customizationMessage = `Con: ${this.selectedDrinks.join(', ')}`;
      if (this.selectedDrinks.includes('Ninguno')) {
        customizationMessage = 'Sin acompañamientos';
      }
    }

    this.addProductToOrder({
      name: `${productPrefix} ${productName}`,
      price: this.currentProduct.price,
      customizations: [customizationMessage]
    });

    modal.style.display = 'none';
  },

  showLiterOptionsModal: function() {
    const modal = document.getElementById('drink-options-modal');
    const optionsContainer = document.getElementById('drink-options-container');

    // Clear previous options
    optionsContainer.innerHTML = '';
    this.selectedDrinks = [];

    // Determine the bottle category
    this.bottleCategory = this.getLiquorType(this.currentProduct.name);

    // Get appropriate options based on liquor type
    const { options, message } = this.getLiterOptionsForProduct(this.bottleCategory);

    // Add message to modal
    const messageElement = document.createElement('p');
    messageElement.className = 'drink-options-message';
    messageElement.textContent = 'Elija una opción para acompañar su litro:';
    optionsContainer.appendChild(messageElement);

    // Create the options grid
    const optionsGrid = document.createElement('div');
    optionsGrid.className = 'options-grid';
    
    options.forEach(option => {
      const optionButton = document.createElement('button');
      optionButton.className = 'drink-option';
      optionButton.textContent = option;
      optionButton.addEventListener('click', () => {
        // Clear previous selections
        document.querySelectorAll('.drink-option').forEach(btn => {
          btn.classList.remove('selected');
        });
        // Mark this option as selected
        optionButton.classList.add('selected');
        this.selectedDrinks = [option];
      });
      optionsGrid.appendChild(optionButton);
    });

    optionsContainer.appendChild(optionsGrid);
    modal.style.display = 'flex';
  },

  getLiterOptionsForProduct: function(category) {
    let options = [];
    let message = 'Elija una opción para acompañar su litro:';

    switch(category) {
      case 'RON':
        options = ['Mineral', 'Manzana', 'Coca', 'Mineral-Coca', 'Mineral-Manzana', 'Pintado-Coca', 'Pintado-Manzana'];
        break;
      case 'TEQUILA':
        options = ['Toronja', 'Mineral', 'Coca', 'Toronja-Mineral', 'Bandera', 'Paloma'];
        break;
      case 'BRANDY':
        options = ['Coca', 'Manzana', 'Mineral', 'Mineral-Coca', 'Mineral-Manzana', 'Paris'];
        break;
      case 'WHISKY':
        options = ['Mineral', 'Manzana', 'Ginger ale', 'Botella de Agua', 'Rocas'];
        break;
      case 'VODKA':
        options = ['Piña', 'Naranja', 'Arándano', 'Mango', 'Uva', 'Durazno', 'Mineral', 'Tonic'];
        break;
      case 'MEZCAL':
        options = ['Naranja y Sal de gusano', 'Toronja'];
        break;
      case 'GINEBRA':
        options = ['Piña', 'Naranja', 'Arándano', 'Mango', 'Uva', 'Durazno', 'Mineral', 'Tonic'];
        break;
      case 'COGNAC':
        options = ['Puesto-Mineral', 'Puesto-Coca', 'Puesto-Manzana', 'Rocas'];
        break;
      case 'ESPUMOSOS':
        options = ['Ninguno'];
        break;
      case 'DIGESTIVOS':
        options = ['Mineral', 'Botella de Agua'];
        break;
      default:
        options = ['Mineral', 'Agua', 'Coca', 'Manzana'];
    }

    return { options, message };
  },

  showCupOptionsModal: function() {
    const modal = document.getElementById('drink-options-modal');
    const optionsContainer = document.getElementById('drink-options-container');

    // Clear previous options
    optionsContainer.innerHTML = '';
    this.selectedDrinks = [];

    // Determine the cup category
    this.bottleCategory = this.getLiquorType(this.currentProduct.name);

    // Add message to modal
    const messageElement = document.createElement('p');
    messageElement.className = 'drink-options-message';
    messageElement.textContent = 'Cada copa se sirve con 1 ½ oz del destilado que elija.';
    optionsContainer.appendChild(messageElement);

    // Get appropriate options based on liquor type
    const options = this.getCupOptionsForProduct(this.bottleCategory);

    // Create the options grid
    const optionsGrid = document.createElement('div');
    optionsGrid.className = 'options-grid';
    
    options.forEach(option => {
      const optionButton = document.createElement('button');
      optionButton.className = 'drink-option';
      optionButton.textContent = option;
      optionButton.addEventListener('click', () => {
        // Clear previous selections
        document.querySelectorAll('.drink-option').forEach(btn => {
          btn.classList.remove('selected');
        });
        // Mark this option as selected
        optionButton.classList.add('selected');
        this.selectedDrinks = [option];
      });
      optionsGrid.appendChild(optionButton);
    });

    optionsContainer.appendChild(optionsGrid);
    modal.style.display = 'flex';
  },

  getCupOptionsForProduct: function(category) {
    switch(category) {
      case 'RON':
        return ['Mineral', 'Manzana', 'Coca', 'Mineral-Coca', 'Mineral-Manzana', 'Pintado-Coca', 'Pintado-Manzana'];
      case 'TEQUILA':
        return ['Toronja', 'Mineral', 'Coca', 'Toronja-Mineral', 'Bandera', 'Paloma'];
      case 'BRANDY':
        return ['Coca', 'Manzana', 'Mineral', 'Mineral-Coca', 'Mineral-Manzana', 'Paris'];
      case 'WHISKY':
        return ['Mineral', 'Manzana', 'Ginger ale', 'Botella de Agua', 'Rocas'];
      case 'VODKA':
        return ['Piña', 'Naranja', 'Arándano', 'Mango', 'Uva', 'Durazno', 'Mineral', 'Tonic'];
      case 'MEZCAL':
        return ['Naranja y Sal de gusano', 'Toronja'];
      case 'GINEBRA':
        return ['Piña', 'Naranja', 'Arándano', 'Mango', 'Uva', 'Durazno', 'Mineral', 'Tonic'];
      case 'COGNAC':
        return ['Puesto-Mineral', 'Puesto-Coca', 'Puesto-Manzana', 'Rocas'];
      case 'ESPUMOSOS':
        return ['Ninguno'];
      case 'DIGESTIVOS':
        return ['Mineral', 'Botella de Agua'];
      default:
        return ['Mineral', 'Agua', 'Coca', 'Manzana'];
    }
  },

  showFoodCustomizationModal: function() {
    const modal = document.getElementById('food-customization-modal');
    const inputContainer = document.getElementById('ingredients-input-container');

    // Reset the modal
    inputContainer.style.display = 'none';
    document.getElementById('ingredients-to-remove').value = '';
    modal.style.display = 'flex';
  },

  showIngredientsInput: function() {
    document.getElementById('ingredients-input-container').style.display = 'block';
    document.querySelector('.ingredients-choice').style.display = 'none';
  },

  addFoodWithoutCustomization: function() {
    const modal = document.getElementById('food-customization-modal');

    this.addProductToOrder({
      name: this.currentProduct.name,
      price: this.currentProduct.price,
      customizations: ['Con todos los ingredientes']
    });

    modal.style.display = 'none';
  },

  confirmIngredientCustomization: function() {
    const modal = document.getElementById('food-customization-modal');
    const ingredientsToRemove = document.getElementById('ingredients-to-remove').value.trim();

    if (ingredientsToRemove) {
      this.addProductToOrder({
        name: this.currentProduct.name,
        price: this.currentProduct.price,
        customizations: [`Sin: ${ingredientsToRemove}`]
      });
    } else {
      this.addFoodWithoutCustomization();
    }

    modal.style.display = 'none';
  },

  showMeatCustomizationModal: function() {
    const modal = document.getElementById('meat-customization-modal');
    const garnishInput = document.getElementById('garnish-input-container');
    const cookingOptions = document.querySelectorAll('.cooking-option');

    // Reset the modal
    garnishInput.style.display = 'none';
    document.getElementById('garnish-modifications').value = '';
    cookingOptions.forEach(option => option.classList.remove('selected'));
    document.querySelector('.garnish-choice').style.display = 'flex';
    this.selectedCookingTerm = null;
    modal.style.display = 'flex';
  },

  showGarnishInput: function() {
    if (!this.selectedCookingTerm) {
      alert('Por favor seleccione un término de cocción primero');
      return;
    }

    document.getElementById('garnish-input-container').style.display = 'block';
    document.querySelector('.garnish-choice').style.display = 'none';
  },

  addMeatWithoutGarnishChange: function() {
    const modal = document.getElementById('meat-customization-modal');

    if (!this.selectedCookingTerm) {
      alert('Por favor seleccione un término de cocción primero');
      return;
    }

    this.addProductToOrder({
      name: this.currentProduct.name,
      price: this.currentProduct.price,
      customizations: [`Término: ${this.getTermText(this.selectedCookingTerm)}`, 'Guarnición estándar']
    });

    modal.style.display = 'none';
  },

  getTermText: function(term) {
    switch (term) {
      case 'medio':
        return 'Término ½';
      case 'tres-cuartos':
        return 'Término ¾';
      case 'bien-cocido':
        return 'Bien Cocido';
      default:
        return term;
    }
  },

  confirmGarnishCustomization: function() {
    const modal = document.getElementById('meat-customization-modal');
    const garnishModifications = document.getElementById('garnish-modifications').value.trim();

    if (!this.selectedCookingTerm) {
      alert('Por favor seleccione un término de cocción primero');
      return;
    }

    this.addProductToOrder({
      name: this.currentProduct.name,
      price: this.currentProduct.price,
      customizations: [
        `Término: ${this.getTermText(this.selectedCookingTerm)}`,
        garnishModifications ? `Guarnición: ${garnishModifications}` : 'Guarnición estándar'
      ]
    });

    modal.style.display = 'none';
  },

  cancelProductSelection: function() {
    // Hide all modals
    document.querySelectorAll('.modal').forEach(modal => {
      modal.style.display = 'none';
    });

    // Reset current product
    this.currentProduct = null;
    this.selectedDrinks = [];
    this.selectedCookingTerm = null;
  },

  addProductToOrder: function(orderItem) {
    // Add unique ID to order item
    orderItem.id = Date.now();

    // Add to order
    this.orderItems.push(orderItem);

    // Update order display
    this.updateOrderDisplay();

    // Reset current product
    this.currentProduct = null;
  },

  updateOrderDisplay: function() {
    const orderItemsContainer = document.getElementById('order-items');
    const orderTotalAmount = document.getElementById('order-total-amount');

    // Clear current items
    orderItemsContainer.innerHTML = '';

    // Add each item
    this.orderItems.forEach(item => {
      const itemElement = document.createElement('div');
      itemElement.className = 'order-item';

      const itemHeader = document.createElement('div');
      itemHeader.className = 'order-item-header';

      const itemName = document.createElement('div');
      itemName.className = 'order-item-name';
      itemName.textContent = item.name;

      const removeButton = document.createElement('button');
      removeButton.className = 'remove-order-item';
      removeButton.innerHTML = '&times;';
      removeButton.addEventListener('click', () => {
        this.removeOrderItem(item.id);
      });

      itemHeader.appendChild(itemName);
      itemHeader.appendChild(removeButton);

      const itemPrice = document.createElement('div');
      itemPrice.className = 'order-item-price';
      itemPrice.textContent = `$${item.price.toFixed(2)}`;

      itemElement.appendChild(itemHeader);
      itemElement.appendChild(itemPrice);

      // Add customizations if any
      if (item.customizations && item.customizations.length > 0) {
        item.customizations.forEach(customization => {
          const customElem = document.createElement('div');
          customElem.className = 'order-item-customization';
          customElem.textContent = customization;
          itemElement.appendChild(customElem);
        });
      }

      orderItemsContainer.appendChild(itemElement);
    });

    // Update total
    const total = this.orderItems.reduce((sum, item) => sum + item.price, 0);
    orderTotalAmount.textContent = `$${total.toFixed(2)}`;
  },

  removeOrderItem: function(itemId) {
    this.orderItems = this.orderItems.filter(item => item.id !== itemId);
    this.updateOrderDisplay();
  },

  extractPrice: function(priceText) {
    // Extract numeric value from price text (e.g., "$150.00" -> 150.00)
    const match = priceText.match(/\$?([\d,]+(\.\d+)?)/);
    if (match) {
      return parseFloat(match[1].replace(',', ''));
    }
    return 0;
  },

  completeOrder: function() {
    if (this.orderItems.length === 0) {
      alert('La orden está vacía. Por favor agregue productos.');
      return;
    }

    // Save order to localStorage
    const order = {
      id: Date.now(),
      items: this.orderItems,
      total: this.orderItems.reduce((sum, item) => sum + item.price, 0),
      date: new Date().toLocaleString()
    };
    
    // Get existing orders or initialize empty array
    const existingOrders = JSON.parse(localStorage.getItem('orders') || '[]');
    
    // Add new order
    existingOrders.push(order);
    
    // Save back to localStorage
    localStorage.setItem('orders', JSON.stringify(existingOrders));
    
    // Display orders
    this.displaySavedOrders();

    // Alert and log
    alert('¡Orden completada con éxito!');
    console.log('Order completed:', this.orderItems);

    // Reset the order
    this.orderItems = [];
    this.updateOrderDisplay();
    this.toggleOrderMode();
  },

  cancelOrder: function() {
    if (confirm('¿Está seguro que desea cancelar la orden?')) {
      this.toggleOrderMode();
    }
  },

  getLiquorType: function(productName) {
    if (this.currentCategory === 'LICORES') {
      // We're in a subcategory of licores, return that subcategory
      return this.currentCategory;
    }

    // Try to determine liquor type from name
    const upperName = productName.toUpperCase();

    if (upperName.includes('RON') || upperName.includes('BACARDI')) {
      return 'RON';
    } else if (upperName.includes('TEQUILA') || upperName.includes('CUERVO') || upperName.includes('DON JULIO')) {
      return 'TEQUILA';
    } else if (upperName.includes('WHISKY') || upperName.includes('BUCHANANS')) {
      return 'WHISKY';
    } else if (upperName.includes('VODKA') || upperName.includes('ABSOLUT') || upperName.includes('GREY GOOSE')) {
      return 'VODKA';
    } else if (upperName.includes('BRANDY') || upperName.includes('TORRES')) {
      return 'BRANDY';
    } else if (upperName.includes('GINEBRA') || upperName.includes('GIN')) {
      return 'GINEBRA';
    } else if (upperName.includes('MEZCAL') || upperName.includes('400 CONEJOS')) {
      return 'MEZCAL';
    } else if (upperName.includes('COGNAC') || upperName.includes('REMY') || upperName.includes('HENNESSY')) {
      return 'COGNAC';
    } else if (upperName.includes('BAILEYS') || upperName.includes('JAGERMEISTER')) {
      return 'DIGESTIVOS';
    } else if (upperName.includes('MOET') || upperName.includes('CHANDON')) {
      return 'ESPUMOSOS';
    }

    return 'OTRO';
  },

  displaySavedOrders: function() {
    const createOrderBtn = document.getElementById('create-order-btn');
    const ordersContainer = document.createElement('div');
    ordersContainer.id = 'saved-orders-container';
    
    // Remove existing orders display if any
    const existingContainer = document.getElementById('saved-orders-container');
    if (existingContainer) {
      existingContainer.remove();
    }
    
    // Get orders from localStorage
    const savedOrders = JSON.parse(localStorage.getItem('orders') || '[]');
    
    if (savedOrders.length === 0) {
      return; // No orders to display
    }
    
    // Create container for orders
    ordersContainer.className = 'saved-orders';
    
    // Add each order to the container
    savedOrders.forEach((order, index) => {
      const orderElement = document.createElement('div');
      orderElement.className = 'saved-order';
      
      const orderHeader = document.createElement('h3');
      orderHeader.textContent = `ORDEN ${index + 1} - ${order.date}`;
      orderElement.appendChild(orderHeader);
      
      const orderItemsList = document.createElement('div');
      orderItemsList.className = 'saved-order-items';
      
      order.items.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'saved-order-item';
        
        const itemName = document.createElement('div');
        itemName.className = 'saved-order-item-name';
        itemName.textContent = item.name;
        
        const itemPrice = document.createElement('div');
        itemPrice.className = 'saved-order-item-price';
        itemPrice.textContent = `$${item.price.toFixed(2)}`;
        
        itemElement.appendChild(itemName);
        itemElement.appendChild(itemPrice);
        
        // Add customizations if any
        if (item.customizations && item.customizations.length > 0) {
          item.customizations.forEach(customization => {
            const customElem = document.createElement('div');
            customElem.className = 'saved-order-item-customization';
            customElem.textContent = customization;
            itemElement.appendChild(customElem);
          });
        }
        
        orderItemsList.appendChild(itemElement);
      });
      
      orderElement.appendChild(orderItemsList);
      
      const orderTotal = document.createElement('div');
      orderTotal.className = 'saved-order-total';
      orderTotal.textContent = `Total: $${order.total.toFixed(2)}`;
      orderElement.appendChild(orderTotal);
      
      const deleteButton = document.createElement('button');
      deleteButton.className = 'nav-button delete-order-btn';
      deleteButton.textContent = 'ELIMINAR ORDEN';
      deleteButton.addEventListener('click', () => {
        this.deleteOrder(order.id);
      });
      orderElement.appendChild(deleteButton);
      
      ordersContainer.appendChild(orderElement);
    });
    
    // Insert before the create order button
    createOrderBtn.parentNode.insertBefore(ordersContainer, createOrderBtn);
  },
  
  deleteOrder: function(orderId) {
    // Get orders from localStorage
    const savedOrders = JSON.parse(localStorage.getItem('orders') || '[]');
    
    // Filter out the order to delete
    const updatedOrders = savedOrders.filter(order => order.id !== orderId);
    
    // Save back to localStorage
    localStorage.setItem('orders', JSON.stringify(updatedOrders));
    
    // Update display
    this.displaySavedOrders();
  },

};

// Initialize the order system
document.addEventListener('DOMContentLoaded', function() {
  OrderSystem.initialize();
});

export default OrderSystem;