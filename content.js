const VALIDATION_INTERVAL = 2000; // 5 seconds
let validationInterval = null;
let activeErrors = new Set();
let lastKnownTradeChannel = null;

// Track active error messages

console.log("✅ AI Tooltip Validator Loaded!");

// Create chatbot on page
createChatbot();

// List of invalid address keywords for "Line 1"
const addressKeywords = [
    "Avenue", "Boulevard", "Building", "Business Highway", "Bypass", "Causeway",
    "Center", "Circle", "County Road", "Court", "Drive", "Expressway", "Extension",
    "Farm To Market", "Freeway", "Highway", "Interstate 95", "Lake", "Lane", "Mount",
    "Park", "Parkway", "Pike", "Place", "Plaza", "Point", "Port", "Road", "Route",
    "Rural route", "Square", "State Highway", "Street", "Suite", "Terrace", "Trail",
    "Turnpike", "US Highway", "Way"
];
const tradeChannelsRequiringReportTo = [
    "[01]Wholesale Clubs",
    "[06]Category Killers",
    "[08]Mass Merchandise Stores"
];
// Trade Channels that cannot have [FO] Future Opening status
const tradeChannelsNoFutureOpening = [
    "[59]Unknown On-Premise",
    "[09]Unknown Retailers"
];
// Gas/Fuel related store names must have this trade channel
const GAS_FUEL_TRADE_CHANNEL = "[07]Convenience Stores";

const restrictedPetStoreNames = [
    'Grooming', 'grooming',
    'Day Care', 'day care',
    'Spa', 'spa',
    'Pet Resort', 'pet resort'
];

// Restricted Store Name keywords for Vet Clinic Sub Channel
const restrictedVetClinicStoreNames = [
    'Surgical', 'surgical',
    'Neuter', 'neuter',
    'Spay', 'spay',
    'Emergency', 'emergency',
    'Mobile', 'mobile',
    'Dental', 'dental'
];

const restrictedFarmFeedStoreNames = [
    'Grain Elevator', 'grain elevator',
    'Agricultural', 'agricultural',
    'Equipment', 'equipment'
];

// Restricted Store Name keywords for Vape Store Sub Channel
const restrictedVapeStoreNames = [
    'Pipe', 'pipe', 'Pipes', 'pipes',
    'Cigar', 'cigar',
    'Bongs', 'bongs',
    'Glass', 'glass',
    'Bubblers', 'bubblers'
];

// Pet Super Store names
const Pet_superstore = ['petco', 'Unleashed by petco', 'Petsmart', 'Petco'];

// ====================== CHATBOT WITH SMOOTH ANIMATION ======================

function createChatbot() {
    // Remove existing bot if present
    const existingBot = document.getElementById('ai-bot');
    if (existingBot) existingBot.remove();

    const botContainer = document.createElement('div');
    botContainer.id = 'ai-bot';
    botContainer.style.position = 'fixed';
    botContainer.style.bottom = '20px';
    botContainer.style.right = '20px';
    botContainer.style.width = '350px';
    botContainer.style.backgroundColor = '#fff';
    botContainer.style.border = '1px solid #ddd';
    botContainer.style.borderRadius = '8px';
    botContainer.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    botContainer.style.zIndex = '10000';
    botContainer.style.fontFamily = 'Arial, sans-serif';
    botContainer.style.overflow = 'hidden';
    botContainer.style.display = 'flex';
    botContainer.style.flexDirection = 'column';
    botContainer.style.transition = 'all 0.3s ease, opacity 0.3s ease';

    // Main chatbot content
    botContainer.innerHTML = `
        <div id="ai-bot-header" style="padding: 12px; background: #11d8f2; color: white; border-radius: 8px 8px 0 0; display: flex; justify-content: space-between; align-items: center; cursor: move;">
            <div style="font-weight: bold; font-size: 14px;">
                <span id="error-count" style="background: #ff4757; padding: 2px 6px; border-radius: 10px; margin-right: 8px;">0</span>
                Error Proof Validator
            </div>
            <div id="bot-minimize" style="cursor: pointer; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 14H4V10H20V14Z" fill="white"/>
                </svg>
            </div>
        </div>
        <div id="ai-bot-content" style="flex: 1; display: flex; flex-direction: column; transition: all 0.3s ease;">
            <div id="ai-bot-messages" style="flex: 1; padding: 10px; max-height: 300px; overflow-y: auto; background: white;"></div>
            <div style="padding: 8px; text-align: center; background: #f5f5f5; border-top: 1px solid #ddd;">
                <button id="refresh-errors" style="padding: 6px 12px; cursor: pointer; background: #11d8f2; color: white; border: none; border-radius: 4px;">Refresh</button>
            </div>
        </div>
    `;

    // Minimized state - Robot icon
    const minimizedBot = document.createElement('div');
    minimizedBot.id = 'ai-bot-minimized';
    minimizedBot.style.position = 'fixed';
    minimizedBot.style.bottom = '20px';
    minimizedBot.style.right = '20px';
    minimizedBot.style.width = '40px';
    minimizedBot.style.height = '40px';
    minimizedBot.style.borderRadius = '50%';
    minimizedBot.style.backgroundColor = '#11d8f2';
    minimizedBot.style.display = 'none';
    minimizedBot.style.justifyContent = 'center';
    minimizedBot.style.alignItems = 'center';
    minimizedBot.style.cursor = 'pointer';
    minimizedBot.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    minimizedBot.style.zIndex = '10000';
    minimizedBot.style.transition = 'all 0.3s ease';
    minimizedBot.innerHTML = `
        <img src="https://cdn-icons-png.flaticon.com/512/4712/4712035.png" width="24" height="24" style="filter: brightness(0) invert(1);">
        <div id="minimized-error-count" style="position: absolute; top: -5px; right: -5px; background: #ff4757; color: white; border-radius: 50%; width: 18px; height: 18px; font-size: 10px; display: none; align-items: center; justify-content: center;"></div>
    `;

    document.body.appendChild(botContainer);
    document.body.appendChild(minimizedBot);

    // Make chatbot draggable
    makeDraggable(botContainer);

    // Minimize/maximize functionality with animation
    let isMinimized = false;
    document.getElementById('bot-minimize').onclick = () => {
        isMinimized = true;
        
        // Animate to minimized state
        botContainer.style.opacity = '0';
        botContainer.style.transform = 'scale(0.8)';
        botContainer.style.pointerEvents = 'none';
        
        setTimeout(() => {
            botContainer.style.display = 'none';
            minimizedBot.style.display = 'flex';
            
            // Animation for minimized icon
            minimizedBot.style.transform = 'scale(0)';
            setTimeout(() => {
                minimizedBot.style.transform = 'scale(1)';
            }, 10);
        }, 300);
    };

    // Click minimized icon to restore
    minimizedBot.onclick = () => {
        isMinimized = false;
        
        // Animate minimized icon out
        minimizedBot.style.transform = 'scale(0)';
        
        setTimeout(() => {
            minimizedBot.style.display = 'none';
            botContainer.style.display = 'flex';
            
            // Animate chatbot in
            botContainer.style.opacity = '0';
            botContainer.style.transform = 'scale(0.8)';
            setTimeout(() => {
                botContainer.style.opacity = '1';
                botContainer.style.transform = 'scale(1)';
                botContainer.style.pointerEvents = 'auto';
            }, 10);
        }, 300);
    };

    // Refresh button
    document.getElementById('refresh-errors').onclick = () => {
        validateAllFields();
    };

    // Add some basic styling
    const style = document.createElement('style');
    style.textContent = `
        .bot-message {
            padding: 8px;
            margin: 5px 0;
            border-radius: 4px;
            font-size: 13px;
            line-height: 1.4;
            word-wrap: break-word;
        }
        .bot-message.error {
            background: #ffebee;
            border-left: 3px solid #f44336;
        }
        .bot-message.success {
            background: #e8f5e9;
            border-left: 3px solid #4caf50;
        }
        .bot-timestamp {
            font-size: 11px;
            color: #666;
            margin-top: 4px;
        }
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }
        .pulse {
            animation: pulse 1.5s infinite;
        }
    `;
    document.head.appendChild(style);
}

function addToChatbot(message, type = 'error') {
    const chat = document.getElementById('ai-bot-messages');
    if (!chat) return;

    const chatMessage = document.createElement('div');
    chatMessage.className = `bot-message ${type}`;
    chatMessage.innerHTML = message;
    
    const timestamp = document.createElement('div');
    timestamp.className = 'bot-timestamp';
    timestamp.textContent = new Date().toLocaleTimeString();
    chatMessage.appendChild(timestamp);

    chat.appendChild(chatMessage);
    chat.scrollTop = chat.scrollHeight;
}
function makeDraggable(element) {
    const header = element.querySelector('#ai-bot-header');
    let isDragging = false;
    let offsetX, offsetY;

    header.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - element.getBoundingClientRect().left;
        offsetY = e.clientY - element.getBoundingClientRect().top;
        element.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const x = e.clientX - offsetX;
        const y = e.clientY - offsetY;
        
        const maxX = window.innerWidth - element.offsetWidth;
        const maxY = window.innerHeight - element.offsetHeight;
        
        element.style.left = `${Math.min(Math.max(0, x), maxX)}px`;
        element.style.top = `${Math.min(Math.max(0, y), maxY)}px`;
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        element.style.cursor = '';
    });
}

function updateErrorCount() {
    const count = activeErrors.size;
    const countElement = document.getElementById('error-count');
    const minimizedCountElement = document.getElementById('minimized-error-count');
    
    if (countElement) {
        countElement.textContent = count;
        countElement.style.display = count > 0 ? 'inline-block' : 'none';
    }
    
    if (minimizedCountElement) {
        minimizedCountElement.textContent = count;
        minimizedCountElement.style.display = count > 0 ? 'flex' : 'none';
    }
}

// ====================== TOOLTIP FIXES ======================
const correctedErrors = new Set();

function createTooltip(element, message, isCorrect) {
    removeExistingTooltip(element);

    const errorKey = `${element.id || element.name}-${message}`;
    if (correctedErrors.has(errorKey) && !isCorrect) {
        return null;
    }

    const tooltip = document.createElement("div");
    tooltip.className = "ai-tooltip";
    tooltip.dataset.for = element.id || element.name || '';
    
    tooltip.innerHTML = `
        <div style="display: flex; flex-direction: column; max-width: 300px;">
            <div style="display: flex; align-items: flex-start; margin-bottom: 8px;">
                <span style="margin-right: 6px; flex-shrink: 0;">${isCorrect ? '✅' : '⚠️'}</span>
                <span style="white-space: normal; word-break: break-word; flex: 1;">${message}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 11px;">
                <span id="mark-correct" style="color: #4CAF50; cursor: pointer; padding: 2px 5px; border-radius: 3px; background: rgba(255,255,255,0.2);">✓ Correct</span>
                <span id="dismiss-tooltip" style="color: #2196F3; cursor: pointer; padding: 2px 5px; border-radius: 3px; background: rgba(255,255,255,0.2);">✕ Dismiss</span>
            </div>
        </div>
    `;
    
    tooltip.style.position = "absolute";
    tooltip.style.padding = "10px";
    tooltip.style.borderRadius = "6px";
    tooltip.style.color = "white";
    tooltip.style.zIndex = "10000";
    tooltip.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)";
    tooltip.style.backgroundColor = isCorrect ? "#4CAF50" : "#ff4757";
    tooltip.style.maxWidth = "300px";
    tooltip.style.fontSize = "13px";
    tooltip.style.lineHeight = "1.4";
    tooltip.style.whiteSpace = "normal";
    tooltip.style.wordBreak = "break-word";
    tooltip.style.opacity = "0";
    tooltip.style.transform = "translateY(10px)";
    tooltip.style.transition = "all 0.2s ease";

    document.body.appendChild(tooltip);

    // Animate in
    setTimeout(() => {
        tooltip.style.opacity = "1";
        tooltip.style.transform = "translateY(0)";
    }, 10);

    positionTooltip(element, tooltip);

    // Click handlers
    tooltip.querySelector('#dismiss-tooltip').addEventListener('click', (e) => {
        e.stopPropagation();
        tooltip.style.opacity = "0";
        tooltip.style.transform = "translateY(10px)";
        setTimeout(() => {
            tooltip.remove();
            element.style.boxShadow = '';
        }, 200);
    });

    tooltip.querySelector('#mark-correct').addEventListener('click', (e) => {
        e.stopPropagation();
        correctedErrors.add(errorKey);
        tooltip.style.opacity = "0";
        tooltip.style.transform = "translateY(10px)";
        setTimeout(() => {
            tooltip.remove();
            element.style.boxShadow = '';
        }, 200);
    });

    const dismissTimer = setTimeout(() => {
        tooltip.style.opacity = "0";
        tooltip.style.transform = "translateY(10px)";
        setTimeout(() => {
            if (tooltip.parentNode) {
                tooltip.remove();
                element.style.boxShadow = '';
            }
        }, 200);
    }, 10000);

    tooltip.addEventListener('mouseenter', () => {
        clearTimeout(dismissTimer);
    });

    tooltip.addEventListener('mouseleave', () => {
        setTimeout(() => {
            tooltip.style.opacity = "0";
            tooltip.style.transform = "translateY(10px)";
            setTimeout(() => {
                if (tooltip.parentNode) {
                    tooltip.remove();
                    element.style.boxShadow = '';
                }
            }, 200);
        }, 2000);
    });

    if (!isCorrect) {
        element.style.boxShadow = '0 0 0 2px #ff4757';
        element.style.borderRadius = '3px';
        element.style.transition = 'box-shadow 0.2s ease';
    }
    
    return tooltip;
}

function positionTooltip(element, tooltip) {
    const elementRect = element.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    
    let top = scrollY + elementRect.top - tooltipRect.height - 10;
    let left = scrollX + elementRect.left + (elementRect.width / 2) - (tooltipRect.width / 2);
    
    if (top < scrollY) {
        top = scrollY + elementRect.bottom + 10;
    }
    
    left = Math.max(scrollX, Math.min(left, scrollX + window.innerWidth - tooltipRect.width));
    top = Math.max(scrollY, Math.min(top, scrollY + window.innerHeight - tooltipRect.height));
    
    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
}

function removeExistingTooltip(element) {
    const elementId = element.id || element.name || '';
    document.querySelectorAll('.ai-tooltip').forEach(tooltip => {
        if (tooltip.dataset.for === elementId) {
            tooltip.style.opacity = "0";
            tooltip.style.transform = "translateY(10px)";
            setTimeout(() => tooltip.remove(), 200);
        }
    });
    element.style.boxShadow = '';
}

// ====================== VALIDATION FUNCTION ENHANCEMENT ======================

function validateAllFields() {
    document.querySelectorAll('.ai-tooltip').forEach(tooltip => {
        tooltip.style.opacity = "0";
        tooltip.style.transform = "translateY(10px)";
        setTimeout(() => tooltip.remove(), 200);
    });
    
    const chat = document.getElementById('ai-bot-messages');
    if (chat) chat.innerHTML = "";

    activeErrors.clear();

    const validationResults = [
        validateStoreName({ target: findStoreNameInput() }),
        validateLine1Address({ target: findLine1Input() }),
        validateStoreNameAndTradeChannel(),
        // validateTradeChannelAndReportTo(),
        validateTradeChannelAndStoreStatus(),
        validateExceptionCodeAndStoreStatus(),
        validateDuplicateStoreStatusAndExceptionCode(),
        validateStoreStatusAndVSS(),
        validateMarketingGroupAndStoreName(),
        validateGasForGroceryStores(),
        validateSpecialEventRequirements(),
        validateHighVolCig(),
        validateMedicalCannabisRequirement(),
        validateFoodTypeRequirements(),
        validateStoreOpenDate(),
        validateVerifiedStoreStatusDate(),
        // validatePhoneNumberForOperatingStores(),
        validatePharmacyForRestrictedChannels(),
        validateAlcoholForRestrictedChannels(),
        validateCannabisForRestrictedStates(),
        validatePharmacyForDrugStores(),
        // validateReportToAndMarketingGroup(),
        validatePetTradeChannelAndStoreName(),
        validateVetClinicSubChannelAndStoreName(),
        validateFarmFeedSubChannelAndStoreName(),
        validateVapeStoreSubChannelAndStoreName(),
        validatePetSuperStoreName(),
        validateAlcoholStoreName()
    ];

    validationResults.forEach(result => {
        if (Array.isArray(result)) {
            result.forEach(msg => {
                if (msg) {
                    addToChatbot(msg);
                    activeErrors.add(msg);
                }
            });
        } else if (result) {
            addToChatbot(result);
            activeErrors.add(result);
        }
    });

    Object.entries(UNVERIFIABLE_REQUIREMENTS).forEach(([fieldName, expectedValue]) => {
        const validationFn = validateUnverifiableField(fieldName, expectedValue);
        const error = validationFn();
        if (error) {
            addToChatbot(error);
            activeErrors.add(error);
        }
    });

    if (activeErrors.size === 0 && chat) {
        addToChatbot("✅ All validations passed!", "success");
    }

    updateErrorCount();
}
// 🔹 Function to find Line 1 address input field
function findLine1Input() {
    let labels = document.querySelectorAll("label, span");
    for (let label of labels) {
        if (label.innerText.trim() === "Line 1:") {
            let input = label.closest("div")?.querySelector("input");
            if (input) {
                console.log("✅ Found Line 1 input!");
                return input;
            }
        }
    }
    console.error("❌ Line 1 input not found.");
    return null;
}
function validateVerifiedStoreStatusDate() {
    const verificationDateInput = document.querySelector('input[name="verificationDTTM"]');
    
    if (!verificationDateInput) {
        console.error("Verified Store Status Date field not found");
        return null;
    }

    const verificationDate = verificationDateInput.value.trim();
    
    // Skip validation if field is empty
    if (verificationDate === "") {
        removeExistingTooltip(verificationDateInput);
        return null;
    }

    // Get current date in MM/dd/yyyy format
    const today = new Date();
    const currentDateFormatted = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`;
    
    // Compare dates (case sensitive exact match)
    if (verificationDate !== currentDateFormatted) {
        const message = `❌ Verified Store Status Date must be today's date (${currentDateFormatted})`;
        createTooltip(verificationDateInput, message, false);
        return message;
    }

    // If validation passes, remove any existing tooltip
    removeExistingTooltip(verificationDateInput);
    return null;
}

function validateStoreOpenDate() {
    const storeStatusInput = findExtJSComboBox("Store Status:");
    const storeOpenDateInput = document.querySelector('input[name="storeOpenDate"]');
    
    if (!storeStatusInput || !storeOpenDateInput) {
        console.error("Store Status or Store Open Date field not found");
        return null;
    }

    const storeStatus = storeStatusInput.value || storeStatusInput.getAttribute('data-value') || '';
    const storeOpenDate = storeOpenDateInput.value || '';

    // Check if Store Status is NOT [FO] Future Opening
    if (!storeStatus.includes("[FO] Future Opening")) {
        // If there's any text in Store Open Date field, show error
        if (storeOpenDate.trim() !== "") {
            const message = "❌ Store Open Date should only be filled when Store Status is [FO] Future Opening";
            createTooltip(storeOpenDateInput, message, false);
            return message;
        }
    } else {
        // For [FO] Future Opening status, ensure date is valid
        if (storeOpenDate.trim() === "") {
            const message = "❌ Future Opening stores must have a Store Open Date";
            createTooltip(storeOpenDateInput, message, false);
            return message;
        }
        
        // You can add additional date format validation here if needed
        // Example: check if it's a valid MM/dd/yyyy date
    }

    // If validation passes, remove any existing tooltip
    removeExistingTooltip(storeOpenDateInput);
    return null;
}
function validateSpecialEventRequirements() {
    const subChannelInput = findExtJSComboBox("Sub Channel:");
    const storeStatusInput = findExtJSComboBox("Store Status:");
    const verifiedStatusInput = findExtJSComboBox("Verified Store Status Source:");
    const exceptionCodeInput = findExtJSComboBox("Exception Code:");

    if (!subChannelInput || !storeStatusInput || !verifiedStatusInput || !exceptionCodeInput) {
        console.error("Required fields not found");
        return null;
    }

    const subChannel = subChannelInput.value || subChannelInput.getAttribute('data-value') || '';
    const storeStatus = storeStatusInput.value || storeStatusInput.getAttribute('data-value') || '';
    const verifiedStatus = verifiedStatusInput.value || verifiedStatusInput.getAttribute('data-value') || '';
    const exceptionCode = exceptionCodeInput.value || exceptionCodeInput.getAttribute('data-value') || '';

    // Check if subchannel is [N]Special Event or [K]Client Internal
    const isSpecialEvent = subChannel.includes("[N]Special Event") || subChannel.includes("[K]Client Internal");
    
    if (!isSpecialEvent) {
        return null; // Skip validation if not special event/client internal
    }

    let errorMessages = [];

    // Validate Store Status should be [NA] Inactive/Not Verified
    if (!storeStatus.includes("[NA] Inactive/Not Verified")) {
        errorMessages.push("❌ Special Event/Client Internal stores must have Store Status: [NA] Inactive/Not Verified");
        createTooltip(storeStatusInput, errorMessages[errorMessages.length-1], false);
    }

    // Validate Verified Store Status Source should be [34] Special Projects
    if (!verifiedStatus.includes("[34] Special Projects")) {
        errorMessages.push("❌ Special Event/Client Internal stores must have VSS: [34] Special Projects");
        createTooltip(verifiedStatusInput, errorMessages[errorMessages.length-1], false);
    }

    // Validate Exception Code should be 777798Z
    if (!exceptionCode.includes("777798Z")) {
        errorMessages.push("❌ Special Event/Client Internal stores must have Exception Code: 777798Z");
        createTooltip(exceptionCodeInput, errorMessages[errorMessages.length-1], false);
    }

    // Add all errors to chatbot
    if (errorMessages.length > 0) {
        errorMessages.forEach(msg => addToChatbot(msg));
        return errorMessages;
    }

    return null;
}
// 🔹 Function to validate Pet Super Store names
function validatePetSuperStoreName() {
    let subChannelInput = findExtJSComboBox("Sub Channel:");
    let storeNameInput = findStoreNameInput();

    if (!subChannelInput || !storeNameInput) {
        console.error("❌ Sub Channel or Store Name input not found.");
        return;
    }

    let subChannel = subChannelInput.value || subChannelInput.getAttribute('data-value') || '';
    let storeName = storeNameInput.value || storeNameInput.getAttribute('data-value') || '';

    // Check if Sub Channel is Pet Super Store
    if (subChannel.includes("Pet Super Store") || subChannel.includes("pet super store")) {
        // Check if Store Name contains any of the allowed names (case insensitive)
        const hasValidName = Pet_superstore.some(name =>
            storeName.toLowerCase().includes(name.toLowerCase())
        );

        if (!hasValidName) {
            const message = "❌ Invalid Store Name: Pet Super Stores must include one of: Petco, Unleashed by petco, or Petsmart!";
            createTooltip(storeNameInput, message, false);
            return message;
        }
    }
    return null;
}

// 🔹 Function to find input fields based on label text
function findInputByText(text) {
    let labels = document.querySelectorAll("label, span");
    for (let label of labels) {
        if (label.innerText.trim() === text) {
            let input = label.closest("div")?.querySelector("input");
            if (input) {
                console.log(`✅ Found input for: ${text}`);
                return input;
            }
        }
    }
    console.error(`❌ Input not found for: ${text}`);
    return null;
}

// 🔹 Function to validate Vape Store Sub Channel and Store Name
function validateVapeStoreSubChannelAndStoreName() {
    let subChannelInput = findExtJSComboBox("Sub Channel:");
    let storeNameInput = findStoreNameInput();

    if (!subChannelInput || !storeNameInput) {
        console.error("❌ Sub Channel or Store Name input not found.");
        return;
    }

    let subChannel = subChannelInput.value || subChannelInput.getAttribute('data-value') || '';
    let storeName = storeNameInput.value || storeNameInput.getAttribute('data-value') || '';

    console.log("Sub Channel:", subChannel);
    console.log("Store Name:", storeName);

    // Check if Sub Channel is [5]Vape Store
    if (subChannel.includes("[5]Vape Store")) {
        // Check if Store Name contains restricted keywords
        const hasRestrictedKeyword = restrictedVapeStoreNames.some(keyword =>
            storeName.includes(keyword)
        );

        if (hasRestrictedKeyword) {
            const message = "❌ Invalid Store Name: Vape stores cannot contain pipe/cigar/bongs/glass/bubblers keywords!";
            createTooltip(storeNameInput, message, false);
            return message;
        }
    }
    return null;
}

// 🔹 Function to validate Farm and Feed Sub Channel and Store Name
function validateFarmFeedSubChannelAndStoreName() {
    let subChannelInput = findExtJSComboBox("Sub Channel:");
    let storeNameInput = findStoreNameInput();

    if (!subChannelInput || !storeNameInput) {
        console.error("❌ Sub Channel or Store Name input not found.");
        return;
    }

    let subChannel = subChannelInput.value || subChannelInput.getAttribute('data-value') || '';
    let storeName = storeNameInput.value || storeNameInput.getAttribute('data-value') || '';

    console.log("Sub Channel:", subChannel);
    console.log("Store Name:", storeName);

    // Check if Sub Channel is [U]Farm and Feed
    if (subChannel.includes("[U]Farm and Feed")) {
        // Check if Store Name contains restricted keywords
        const hasRestrictedKeyword = restrictedFarmFeedStoreNames.some(keyword =>
            storeName.includes(keyword)
        );

        if (hasRestrictedKeyword) {
            const message = "❌ Invalid Store Name: FarmNFeed stores cannot contain grain elevator/agricultural/equipment keywords!";
            createTooltip(storeNameInput, message, false);
            return message;
        }
    }
    return null;
}

// 🔹 Function to validate Vet Clinic Sub Channel and Store Name
function validateVetClinicSubChannelAndStoreName() {
    let subChannelInput = findExtJSComboBox("Sub Channel:");
    let storeNameInput = findStoreNameInput();

    if (!subChannelInput || !storeNameInput) {
        console.error("❌ Sub Channel or Store Name input not found.");
        return;
    }

    let subChannel = subChannelInput.value || subChannelInput.getAttribute('data-value') || '';
    let storeName = storeNameInput.value || storeNameInput.getAttribute('data-value') || '';

    console.log("Sub Channel:", subChannel);
    console.log("Store Name:", storeName);

    // Check if Sub Channel is [3]Vet Clinic
    if (subChannel.includes("[3]Vet Clinic")) {
        // Check if Store Name contains restricted keywords
        const hasRestrictedKeyword = restrictedVetClinicStoreNames.some(keyword =>
            storeName.includes(keyword)
        );

        if (hasRestrictedKeyword) {
            const message = "❌ Invalid Store Name: Vet Clinic stores cannot contain surgical/neuter/spay/emergency/mobile/dental keywords!";
            createTooltip(storeNameInput, message, false);
            return message;
        }
    }
    return null;
}

// 🔹 Function to validate Pet Trade Channel and Store Name
function validatePetTradeChannelAndStoreName() {
    let tradeChannelInput = findExtJSComboBox("Trade Channel:");
    let storeNameInput = findStoreNameInput();

    if (!tradeChannelInput || !storeNameInput) {
        console.error("❌ Trade Channel or Store Name input not found.");
        return;
    }

    let tradeChannel = tradeChannelInput.value || tradeChannelInput.getAttribute('data-value') || '';
    let storeName = storeNameInput.value || storeNameInput.getAttribute('data-value') || '';

    console.log("Trade Channel:", tradeChannel);
    console.log("Store Name:", storeName);

    // Check if Trade Channel is [11]Pet
    if (tradeChannel.includes("[11]Pet")) {
        // Check if Store Name contains restricted keywords
        const hasRestrictedKeyword = restrictedPetStoreNames.some(keyword =>
            storeName.includes(keyword)
        );

        if (hasRestrictedKeyword) {
            const message = "❌ Invalid Store Name: Pet stores cannot contain grooming/day care/spa/resort keywords!";
            createTooltip(storeNameInput, message, false);
            return message;
        }
    }
    return null;
}

// 🔹 Function to validate Store Name and Trade Channel
function validateStoreNameAndTradeChannel() {
    let storeNameInput = findStoreNameInput();
    let tradeChannelInput = findExtJSComboBox("Trade Channel:");

    if (!storeNameInput || !tradeChannelInput) {
        console.error("❌ Store Name or Trade Channel input not found.");
        return;
    }

    let storeName = storeNameInput.value || storeNameInput.getAttribute('data-value') || '';
    let tradeChannel = tradeChannelInput.value || tradeChannelInput.getAttribute('data-value') || '';

    console.log("Store Name:", storeName);
    console.log("Trade Channel:", tradeChannel);

    // Check if Store Name contains Gas or Fuel
    if (storeName.match(/Gas|Fuel/i)) {
        // Trade Channel should be [07]Convenience Stores
        if (!tradeChannel.includes(GAS_FUEL_TRADE_CHANNEL)) {
            const message = `❌ Invalid Trade Channel: Stores with 'Gas' or 'Fuel' in name must have Trade Channel ${GAS_FUEL_TRADE_CHANNEL}!`;
            createTooltip(tradeChannelInput, message, false);
            return message;
        }
    }
    return null;
}

// 🔹 Function to validate Trade Channel and Store Status
function validateTradeChannelAndStoreStatus() {
    let tradeChannelInput = findExtJSComboBox("Trade Channel:");
    let storeStatusInput = findExtJSComboBox("Store Status:");

    if (!tradeChannelInput || !storeStatusInput) {
        console.error("❌ Trade Channel or Store Status input not found.");
        return;
    }

    let tradeChannel = tradeChannelInput.value || tradeChannelInput.getAttribute('data-value') || '';
    let storeStatus = storeStatusInput.value || storeStatusInput.getAttribute('data-value') || '';

    console.log("Trade Channel:", tradeChannel);
    console.log("Store Status:", storeStatus);

    // Rule: If Trade Channel is [59]Unknown On-Premise or [09]Unknown Retailers
    if (tradeChannelsNoFutureOpening.some(channel => tradeChannel.includes(channel))) {
        // Store Status should not be [FO] Future Opening
        if (storeStatus.includes("[FO] Future Opening")) {
            const message = "❌ Invalid Status: This Trade Channel cannot have [FO] Future Opening status!";
            createTooltip(storeStatusInput, message, false);
            return message;
        }
    }
    return null;
}

// 🔹 Function to validate Trade Channel and Immediate Report To
// function validateTradeChannelAndReportTo() {
//     let tradeChannelInput = findExtJSComboBox("Trade Channel:");
//     let immediateReportToInput = findExtJSComboBox("Immediate Report To:");

//     if (!tradeChannelInput || !immediateReportToInput) {
//         console.error("❌ Trade Channel or Immediate Report To input not found.");
//         return;
//     }

//     let tradeChannel = tradeChannelInput.value || tradeChannelInput.getAttribute('data-value') || '';
//     let immediateReportTo = immediateReportToInput.value || immediateReportToInput.getAttribute('data-value') || '';

//     console.log("Trade Channel:", tradeChannel);
//     console.log("Immediate Report To:", immediateReportTo);

//     // Check if Trade Channel requires Immediate Report To
//     if (tradeChannelsRequiringReportTo.some(channel => tradeChannel.includes(channel))) {
//         if (!immediateReportTo.trim()) {
//             const message = "❌ Immediate Report To is required for this Trade Channel!";
//             createTooltip(immediateReportToInput, message, false);
//             return message;
//         }
//     }
//     return null;
// }

// 🔹 Function to validate bidirectional rules between Exception Code and Store Status
function validateExceptionCodeAndStoreStatus() {
    let exceptionCodeInput = findExtJSComboBox("Exception Code:");
    let storeStatusInput = findExtJSComboBox("Store Status:");

    if (!exceptionCodeInput || !storeStatusInput) {
        console.error("❌ Exception Code or Store Status input not found.");
        return;
    }

    let exceptionCode = exceptionCodeInput.value || exceptionCodeInput.getAttribute('data-value') || '';
    let storeStatus = storeStatusInput.value || storeStatusInput.getAttribute('data-value') || '';

    console.log("Exception Code:", exceptionCode);
    console.log("Store Status:", storeStatus);

    let errorMessages = [];

    // Rule 1: If Exception Code is 777793Z, Store Status must be [UV] Unverifiable
    if (exceptionCode.includes("777793Z")) {
        if (!storeStatus.includes("[UV] Unverifiable")) {
            const message = "❌ When Exception Code is 777793Z, Store Status must be [UV] Unverifiable!";
            createTooltip(storeStatusInput, message, false);
            errorMessages.push(message);
        }
    }

    // Rule 2: If Store Status is [UV] Unverifiable, Exception Code must be 777793Z
    if (storeStatus.includes("[UV] Unverifiable")) {
        if (!exceptionCode.includes("777793Z")) {
            const message = "❌ When Store Status is [UV] Unverifiable, Exception Code must be 777793Z!";
            createTooltip(exceptionCodeInput, message, false);
            errorMessages.push(message);
        }
    }

    return errorMessages.length > 0 ? errorMessages : null;
}

// 🔹 Function to validate Duplicate Store Status and Exception Code
function validateDuplicateStoreStatusAndExceptionCode() {
    let storeStatusInput = findExtJSComboBox("Store Status:");
    let exceptionCodeInput = findExtJSComboBox("Exception Code:");

    if (!storeStatusInput || !exceptionCodeInput) {
        console.error("❌ Store Status or Exception Code input not found.");
        return;
    }

    let storeStatus = storeStatusInput.value || storeStatusInput.getAttribute('data-value') || '';
    let exceptionCode = exceptionCodeInput.value || exceptionCodeInput.getAttribute('data-value') || '';

    console.log("Store Status:", storeStatus);
    console.log("Exception Code:", exceptionCode);

    // Check if Store Status is [DUP] Duplicate
    if (storeStatus.includes("[DUP] Duplicate")) {
        // Exception Code should be empty or 777798Z
        if (exceptionCode.trim() && !exceptionCode.includes("777798Z")) {
            const message = "❌ Invalid Exception Code: When Store Status is [DUP] Duplicate, Exception Code must be empty or 777798Z!";
            createTooltip(exceptionCodeInput, message, false);
            return message;
        }
    }
    return null;
}

// 🔹 Function to validate Marketing Group and Store Name match (words only)
function validateMarketingGroupAndStoreName() {
    let marketingGroupInput = findExtJSComboBox("Marketing Group:");
    let storeNameInput = findStoreNameInput();

    if (!marketingGroupInput || !storeNameInput) {
        console.error("❌ Marketing Group or Store Name input not found.");
        return;
    }

    let marketingGroup = marketingGroupInput.value || marketingGroupInput.getAttribute('data-value') || '';
    let storeName = storeNameInput.value || storeNameInput.getAttribute('data-value') || '';

    console.log("Marketing Group:", marketingGroup);
    console.log("Store Name:", storeName);

    // Check if Marketing Group has any value
    if (marketingGroup.trim()) {
        // Extract only words/letters (remove special characters and numbers)
        const cleanMarketingGroup = marketingGroup.replace(/[^a-zA-Z\s]/g, '').trim();
        const cleanStoreName = storeName.replace(/[^a-zA-Z\s]/g, '').trim();

        // Compare only if we have words to compare after cleaning
        if (cleanMarketingGroup && !cleanStoreName.toLowerCase().includes(cleanMarketingGroup.toLowerCase())) {
            const message = "❌ Incorrect Store Name: Must contain the Marketing Group name (excluding numbers/special chars)!";
            createTooltip(storeNameInput, message, false);
            return message;
        }
    }
    return null;
}

// 🔹 Function to find Marketing Group input field
function findMarketingGroupInput() {
    let labels = document.querySelectorAll("label, span");
    for (let label of labels) {
        if (label.innerText.trim() === "Marketing Group:") {
            let input = label.closest("div")?.querySelector("input");
            if (input) {
                console.log("✅ Found Marketing Group input!");
                return input;
            }
        }
    }
    console.error("❌ Marketing Group input not found.");
    return null;
}

// // 🔹 Function to validate Immediate Report To and Marketing Group
// function validateReportToAndMarketingGroup() {
//     let immediateReportToInput = findExtJSComboBox("Immediate Report To:");
//     let marketingGroupInput = findExtJSComboBox("Marketing Group:");

//     if (!immediateReportToInput || !marketingGroupInput) {
//         console.error("❌ Immediate Report To or Marketing Group input not found.");
//         return;
//     }

//     let immediateReportTo = immediateReportToInput.value || immediateReportToInput.getAttribute('data-value') || '';
//     let marketingGroup = marketingGroupInput.value || marketingGroupInput.getAttribute('data-value') || '';

//     console.log("Immediate Report To:", immediateReportTo);
//     console.log("Marketing Group:", marketingGroup);

//     // Check if Immediate Report To has any value
//     if (immediateReportTo.trim()) {
//         // Marketing Group should not be empty
//         if (!marketingGroup.trim()) {
//             const message = "❌ Null MG: Marketing Group cannot be empty when Immediate Report To is filled!";
//             createTooltip(marketingGroupInput, message, false);
//             return message;
//         }
//     }
//     return null;
// }

// 🔹 Function to validate Store Status and Verified Store Status Source
function validateStoreStatusAndVSS() {
    let storeStatusInput = findExtJSComboBox("Store Status:");
    let verifiedStatusInput = findExtJSComboBox("Verified Store Status Source:");

    if (!storeStatusInput || !verifiedStatusInput) {
        console.error("❌ Store Status or Verified Store Status Source input not found.");
        return;
    }

    let storeStatus = storeStatusInput.value || storeStatusInput.getAttribute('data-value') || '';
    let verifiedStatus = verifiedStatusInput.value || verifiedStatusInput.getAttribute('data-value') || '';

    console.log("Store Status:", storeStatus);
    console.log("Verified Status:", verifiedStatus);

    let errorMessages = [];
    const validOpenOperatingVSS = [
        "[32] Telephone, Direct",
        "[33] Telephone, Indirect",
        "[50] Licensing Agencies, Alcohol",
        "[77] Licensing Agencies, Drug",
        "[NA] Web Sites, Other",
        "[NA] EM Verified through Research",
        "[NA] Web Lookup",
        "[NA] Screen Scrape",
        "[NA] Retailer Store List",
        "[NA] S.E.C."
    ];

    // Rule 1: If Store Status is [OP] Open, Operating
    if (storeStatus.includes("[OP] Open, Operating") || storeStatus.includes("[FO] Future Opening")) {
        const statusType = storeStatus.includes("[OP] Open, Operating") ? "[OP] Open, Operating" : "[FO] Future Opening";
        console.log(`✅ Store Status is ${statusType}.`);

        // Check if VSS is one of the valid options
        const isValidVSS = validOpenOperatingVSS.some(validVSS => 
            verifiedStatus.includes(validVSS)
        );

        if (!isValidVSS) {
            const validOptions = validOpenOperatingVSS.map(vss => vss.split(']')[1]).join(', ');
            const message = `❌ Incorrect VSS for the ${statusType} Store Status`;
            createTooltip(verifiedStatusInput, message, false);
            errorMessages.push(message);
        }
    }
    // Rule 2: If Store Status is [NA] Inactive/Not Verified
    else if (storeStatus.includes("[NA] Inactive/Not Verified")) {
        console.log("✅ Store Status is [NA] Inactive/Not Verified.");

        // It should be [34] Special Projects
        if (!verifiedStatus.includes("[34] Special Projects")) {
            const message = "❌ Incorrect VSS for the [NA] Inactive/Not Verified Store Status!";
            createTooltip(verifiedStatusInput, message, false);
            errorMessages.push(message);
        }
    }
    // Rule 3: If Store Status is [UV] Unverifiable
    else if (storeStatus.includes("[UV] Unverifiable")) {
        console.log("✅ Store Status is [UV] Unverifiable.");

        // It should be [NA] Attempted Contact Failed
        if (!verifiedStatus.includes("[NA] Attempted Contact Failed")) {
            const message = "❌ Incorrect VSS for the Unverifiable Store Status!";
            createTooltip(verifiedStatusInput, message, false);
            errorMessages.push(message);
        }
    }
    else if (storeStatus.includes("[TC] Closed")) {
        console.log("✅ Store Status is [TC] Closed.");

        if (
            !(
                verifiedStatus.includes("[NA] Web Sites, Other") ||
                verifiedStatus.includes("[32] Telephone, Direct") ||
                verifiedStatus.includes("[33] Telephone, Indirect") ||
                verifiedStatus.includes("[60] News/Press Release") ||
                verifiedStatus.includes("[NA] Web Lookup") ||
                verifiedStatus.includes("[NA] Attempted Contact Failed")
            )
        ) {
            const message = "❌ Incorrect VSS for the Closed Store Status!";
            createTooltip(verifiedStatusInput, message, false);
            errorMessages.push(message);
        }
    }
    // Rule 4: If Store Status is [DUP] Duplicate
    else if (storeStatus.includes("[DUP] Duplicate")) {
        console.log("✅ Store Status is [DUP] Duplicate.");

        // It should be [34] Special Projects
        if (!verifiedStatus.includes("[34] Special Projects")) {
            const message = "❌ Wrong VSS: When Store Status is [DUP], VSS should be [34] Special Projects!";
            createTooltip(verifiedStatusInput, message, false);
            errorMessages.push(message);
        }
    }
    // Additional Rule: Restrict certain Store Status values when VSS is [NA] Attempted Contact Failed
    if (verifiedStatus.includes("[NA] Attempted Contact Failed")) {
        if (
            storeStatus.includes("[DUP] Duplicate") ||
            storeStatus.includes("[FO] Future Opening") ||
            storeStatus.includes("[NA] Inactive/Not Verified") ||
            storeStatus.includes("[OP] Open, Operating")
        ) {
            const message = "❌If VSS is [NA] Attempted Contact Failed, Store Status cannot be [DUP], [FO], [NA], or [OP]!";
            createTooltip(verifiedStatusInput, message, false);
            errorMessages.push(message);
        }
    }

    return errorMessages.length > 0 ? errorMessages : null;
}

// 🔹 Function to find ExtJS combobox fields based on label text
function findExtJSComboBox(labelText) {
    let labels = document.querySelectorAll("label, span");
    for (let label of labels) {
        if (label.innerText.trim() === labelText) {
            // Find the associated input field (ExtJS combobox)
            let container = label.closest("div");
            if (container) {
                let input = container.querySelector("input.x-form-text");
                if (input) {
                    console.log(`✅ Found ExtJS combobox for: ${labelText}`);
                    return input;
                }
            }
        }
    }
    console.error(`❌ ExtJS combobox not found for: ${labelText}`);
    return null;
}

// 🔹 Function to validate alcohol-related store names against separate dropdowns
function validateAlcoholStoreName() {
    let storeNameInput = findStoreNameInput();
    let beerDropdown = findExtJSComboBox("Beer:");
    let wineDropdown = findExtJSComboBox("Wine:");
    let liquorDropdown = findExtJSComboBox("Liquor:");

    if (!storeNameInput || !beerDropdown || !wineDropdown || !liquorDropdown) {
        console.error("❌ One or more alcohol-related inputs not found.");
        return;
    }

    let storeName = (storeNameInput.value || storeNameInput.getAttribute('data-value') || '').toLowerCase();
    let beerValue = (beerDropdown.value || beerDropdown.getAttribute('data-value') || '').toString().toLowerCase();
    let wineValue = (wineDropdown.value || wineDropdown.getAttribute('data-value') || '').toString().toLowerCase();
    let liquorValue = (liquorDropdown.value || liquorDropdown.getAttribute('data-value') || '').toString().toLowerCase();

    let errorMessages = [];

    // Check store name for alcohol-related keywords
    if (storeName.includes("beer")) {
        if (beerValue !== "yes") {
            errorMessages.push("❌ Beer should be 'Yes' when store name contains 'Beer'");
        }
    }

    if (storeName.includes("wine")) {
        if (wineValue !== "yes") {
            errorMessages.push("❌ Wine should be 'Yes' when store name contains 'Wine'");
        }
    }

    if (storeName.includes("liquor") || storeName.includes("spirits") || storeName.includes("cocktail")) {
        if (liquorValue !== "yes") {
            errorMessages.push("❌ Liquor should be 'Yes' when store name contains 'Liquor/Spirits/Cocktail'");
        }
    }

    if (errorMessages.length > 0) {
        // Show all errors at once
        errorMessages.forEach(msg => {
            createTooltip(storeNameInput, msg, false);
        });
        return errorMessages;
    }
    return null;
}

// 🔹 Function to find Store Name input field
function findStoreNameInput() {
    let labels = document.querySelectorAll("label, span");
    for (let label of labels) {
        if (label.innerText.trim() === "Store Name:") {
            let input = label.closest("div")?.querySelector("input");
            if (input) {
                console.log("✅ Found Store Name input!");
                return input;
            }
        }
    }
    console.error("❌ Store Name input not found.");
    return null;
}
// 1. Update the configuration at the top
const FOOD_TYPE_REQUIRED_CHANNELS = [
    "[50]Dining",
    "[51]Bar/Nightclub",
    "[55]Caterers"
];

const FOOD_TYPE_REQUIRED_SUBCHANNELS = [
    "[H]Restaurant NA"
];

// 2. Enhanced validation function
function validateFoodTypeRequirements() {
    // Skip if no channel/subchannel data available
    if (!lastKnownTradeChannel && !lastKnownSubChannel) return null;
    
    // Check Trade Channel requirements
    const channelRequiresFoodType = FOOD_TYPE_REQUIRED_CHANNELS.some(channel => 
        lastKnownTradeChannel && lastKnownTradeChannel.includes(channel)
    );
    
    // Check Sub Channel requirements
    const subChannelRequiresFoodType = FOOD_TYPE_REQUIRED_SUBCHANNELS.some(subChannel => 
        lastKnownSubChannel && lastKnownSubChannel.includes(subChannel)
    );
    
    // Skip validation if no requirements met
    if (!channelRequiresFoodType && !subChannelRequiresFoodType) return null;

    const foodTypeInput = findExtJSComboBox("Food Type:");
    if (!foodTypeInput) {
        console.log("Food Type field not found");
        return null;
    }

    const foodType = foodTypeInput.value || foodTypeInput.getAttribute('data-value') || '';
    
    if (!foodType.trim()) {
        let message = "❌ Food Type is required";
        if (channelRequiresFoodType) {
            message += ` for ${lastKnownTradeChannel.split(']')[1]}`;
        }
        if (subChannelRequiresFoodType) {
            message += ` for Sub Channel: ${lastKnownSubChannel.split(']')[1]}`;
        }
        
        createTooltip(foodTypeInput, message, false);
        return message;
    }
    return null;
}

// 3. Update the tracking function (optional improvement)
function trackTradeChannel() {
    const tradeChannelInput = findExtJSComboBox("Trade Channel:");
    if (tradeChannelInput) {
        // Immediate update
        lastKnownTradeChannel = tradeChannelInput.value || tradeChannelInput.getAttribute('data-value') || '';

        // Change listener
        tradeChannelInput.addEventListener("change", function(e) {
            lastKnownTradeChannel = e.target.value || e.target.getAttribute('data-value') || '';
            console.log("Tracking Trade Channel:", lastKnownTradeChannel);
            validateFoodTypeRequirements();
            validatePharmacyForRestrictedChannels();
            validateCannabisForRestrictedStates();
            validateMedicalCannabisRequirement();
            // validatePhoneNumberForOperatingStores();
        });
    }
}
let lastKnownSubChannel = null;

function trackSubChannel() {
    const subChannelInput = findExtJSComboBox("Sub Channel:");
    if (subChannelInput) {
        // Immediate update
        lastKnownSubChannel = subChannelInput.value || subChannelInput.getAttribute('data-value') || '';
        
        // Change listener
        subChannelInput.addEventListener("change", function(e) {
            lastKnownSubChannel = e.target.value || e.target.getAttribute('data-value') || '';
            console.log("Tracking Sub Channel:", lastKnownSubChannel);
            validateFoodTypeRequirements();
            validateGasForGroceryStores();
            validateHighVolCig();
        });
    }
}

// 1. Add to your global variables at the top
const HIGH_VOL_CIG_REQUIRED_SUBCHANNELS = ["[4]Cigarette Outlets - Conventional"];


// 2. Add new validation function
function validateHighVolCig() {
    // Skip if no Sub Channel tracked yet
    if (!lastKnownSubChannel) return null;
    
    // Check if current subchannel requires High Vol Cig validation
    const requiresValidation = HIGH_VOL_CIG_REQUIRED_SUBCHANNELS.some(subChannel => 
        lastKnownSubChannel.includes(subChannel)
    );
    
    if (!requiresValidation) return null;

    const highVolCigInput = findExtJSComboBox("High Vol Cig:");
    if (!highVolCigInput) {
        console.log(`High Vol Cig field not found for ${lastKnownSubChannel}`);
        return null;
    }

    const highVolCig = highVolCigInput.value || highVolCigInput.getAttribute('data-value') || '';
    
    if (highVolCig.toLowerCase() !== "yes") {
        const message = "❌ High Vol Cig must be 'Yes' for Cigarette Outlets";
        createTooltip(highVolCigInput, message, false);
        return message;
    }
    return null;
}

// Add this with your other constants
const GROCERY_STORE_SUBCHANNELS = [
    "[1]Grocery Stores - Limited Assortment",
    "[2]Grocery Stores - Natural/Gourmet Foods",
    "[3]Grocery Stores - Warehouse/C&C"
];

// Add this validation function
function validateGasForGroceryStores() {
    if (!lastKnownSubChannel) return null;
    
    const isGroceryStore = GROCERY_STORE_SUBCHANNELS.some(subChannel => 
        lastKnownSubChannel.includes(subChannel)
    );
    
    if (!isGroceryStore) return null;

    const gasInput = findExtJSComboBox("Gas:");
    if (!gasInput) {
        console.log("Gas field not found");
        return null;
    }

    const gasValue = gasInput.value || gasInput.getAttribute('data-value') || '';
    
    if (gasValue.trim().toLowerCase() !== 'no') {
        const subChannelName = lastKnownSubChannel.split(']')[1];
        const message = `❌ Gas must be "No" for ${subChannelName}`;
        
        createTooltip(gasInput, message, false);
        return message;
    }
    
    return null;
}


// 🔹 Constants for Unverifiable Store requirements
const UNVERIFIABLE_REQUIREMENTS = {
    "Trade Type:": "[C]Retail Trade",
    "Trade Channel:": "[09]Unknown Retailers",
    "Sub Channel:": "[X]Retail Other",
    "Exception Code:": "777793Z"
};

// 🔹 Function to validate a single field for Unverifiable Store
function validateUnverifiableField(fieldName, expectedValue) {
    return function() {
        let storeStatusInput = findExtJSComboBox("Store Status:");
        if (!storeStatusInput) return null;

        let storeStatus = storeStatusInput.value || storeStatusInput.getAttribute('data-value') || '';
        if (!storeStatus.includes("[UV] Unverifiable")) return null;

        let fieldInput = findExtJSComboBox(fieldName);
        if (!fieldInput) return null;

        let fieldValue = fieldInput.value || fieldInput.getAttribute('data-value') || '';
        if (!fieldValue.includes(expectedValue)) {
            const message = `❌ Invalid ${fieldName.replace(':', '')}: Must be ${expectedValue} for Unverifiable stores!`;
            createTooltip(fieldInput, message, false);
            return message;
        }
        return null;
    };
}

// 🔹 Function to validate Store Name field
function validateStoreName(event) {
    if (!event || !event.target) return null;

    let text = event.target.value;
    let errorMessages = [];

    // Check for leading space
    if (text.startsWith(' ')) {
        errorMessages.push("❌ Store Name should not start with a space");
    }

    // Check for trailing space
    if (text.endsWith(' ')) {
        errorMessages.push("❌ Store Name should not end with a space");
    }

    // Check for double spaces
    if (text.includes('  ')) {
        errorMessages.push("❌ Store Name should not contain double spaces");
    }

    // Trim the text for remaining validations
    text = text.trim();

    // List of restricted words (case insensitive)
    const restrictedWords = [
        'accounting', 'advertising', 'billing', 'co', 'company', 'cos', 
        'dist', 'distribution', 'distributor', 'ent', 'enterprises',
        'headquarters', 'hq', 'inc', 'llc', 'region', 'warehouse', 'whse'
    ];

    // Check for restricted words
    const hasRestrictedWord = restrictedWords.some(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        return regex.test(text);
    });

    if (hasRestrictedWord) {
        errorMessages.push("❌ Store Name contains restricted word - Use proper store name instead of company/office terms");
    }

    // Check for special characters
    if (/[^\w\s&'-]/.test(text)) {
        errorMessages.push("❌ Store Name should only contain letters, numbers, spaces, &, ', or -");
    }

    // Check proper case formatting
    const words = text.split(/\s+/).filter(word => word.length > 0); // Filter out empty strings from multiple spaces
    for (let word of words) {
        // Skip words starting with &
        if (word.startsWith('&')) continue;
        
        // Check if word starts with capital letter (after handling apostrophes/hyphens)
        const firstLetter = word.replace(/^['-]+/, '')[0];
        if (!firstLetter || firstLetter !== firstLetter.toUpperCase()) {
            errorMessages.push("❌ Store Name Should Be In Proper Case (Each Word Capitalized)");
            break;
        }
    }

    // Display errors if any
    if (errorMessages.length > 0) {
        // Remove duplicate error messages
        const uniqueErrors = [...new Set(errorMessages)];
        
        uniqueErrors.forEach(msg => {
            createTooltip(event.target, msg, false);
        });
        return uniqueErrors;
    }
    
    // If valid, remove any existing tooltips
    removeExistingTooltip(event.target);
    return null;
}
const PHARMACY_REQUIRED_CHANNEL = "[03]Drug Stores and Pharmacies";
const INVALID_PHARMACY_VALUES = ["No", ""];

function validatePharmacyForDrugStores() {
    // Only validate if current Trade Channel is Drug Stores
    if (!lastKnownTradeChannel || !lastKnownTradeChannel.includes(PHARMACY_REQUIRED_CHANNEL)) {
        return null;
    }

    const pharmacyInput = findExtJSComboBox("Pharmacy:");
    if (!pharmacyInput) {
        console.log("Pharmacy field not found");
        return null;
    }

    const pharmacyValue = pharmacyInput.value || pharmacyInput.getAttribute('data-value') || '';
    
    if (INVALID_PHARMACY_VALUES.includes(pharmacyValue)) {
        const message = "❌ Pharmacy must be specified for Drug Stores and Pharmacies";
        createTooltip(pharmacyInput, message, false);
        return message;
    }
    return null;
}
// 1. Add these constants at the top with other globals
const ALCOHOL_RESTRICTED_CHANNELS = [
    "[06]Category Killers",
    "[11]Pet",
    "[13]Fulfillment",
    "[14]Cannabis",
    "[08]Mass Merchandise Stores"
];

const ALCOHOL_FIELDS = ["Beer:", "Wine:", "Liquor:"];

// 2. Add this new validation function
function validateAlcoholForRestrictedChannels() {
    if (!lastKnownTradeChannel) return null;
    
    // Check if current channel restricts alcohol
    const restrictsAlcohol = ALCOHOL_RESTRICTED_CHANNELS.some(channel => 
        lastKnownTradeChannel.includes(channel)
    );
    
    if (!restrictsAlcohol) return null;

    const errorMessages = [];
    
    ALCOHOL_FIELDS.forEach(fieldName => {
        const fieldInput = findExtJSComboBox(fieldName);
        if (!fieldInput) {
            console.log(`${fieldName} field not found`);
            return;
        }

        const fieldValue = (fieldInput.value || fieldInput.getAttribute('data-value') || '').toLowerCase();
        
        if (fieldValue === "yes" || fieldValue === "") {
            const message = `❌ ${fieldName.replace(':', '')} must be "No" for ${lastKnownTradeChannel.split(']')[1]}`;
            createTooltip(fieldInput, message, false);
            errorMessages.push(message);
        }
    });

    return errorMessages.length > 0 ? errorMessages : null;
}
const PHARMACY_RESTRICTED_CHANNELS = [
    "[07]Convenience Stores",
    "[06]Category Killers", 
    "[14]Cannabis"
];
function validatePharmacyForRestrictedChannels() {
    // Skip if no Trade Channel tracked yet
    if (!lastKnownTradeChannel) return null;
    
    // Check if current channel restricts Pharmacy
    const restrictsPharmacy = PHARMACY_RESTRICTED_CHANNELS.some(channel => 
        lastKnownTradeChannel.includes(channel)
    );
    
    if (!restrictsPharmacy) return null;

    const pharmacyInput = findExtJSComboBox("Pharmacy:");
    if (!pharmacyInput) {
        console.log(`Pharmacy field not found for ${lastKnownTradeChannel}`);
        return null;
    }

    const pharmacyValue = pharmacyInput.value || pharmacyInput.getAttribute('data-value') || '';
    
    if (pharmacyValue.toLowerCase() === "yes"||pharmacyValue.toLowerCase() === "") {
        const message = `❌ Pharmacy must be "No" for ${lastKnownTradeChannel.split(']')[1]}`;
        createTooltip(pharmacyInput, message, false);
        return message;
    }
    return null;
}
// 🔹 Function to validate Line 1 address field
function validateLine1Address(event) {
    if (!event || !event.target) return null;

    // Find the Address Quality field
    const addressQualityInput = findExtJSComboBox("Address Quality:");
    if (!addressQualityInput) {
        console.error("Address Quality field not found");
        return null;
    }

    // Get Address Quality value
    const addressQuality = addressQualityInput.value || addressQualityInput.getAttribute('data-value') || '';
    
    // Only validate if Address Quality is Non Standardized
    if (!addressQuality.includes("Non Standardized")) {
        removeExistingTooltip(event.target); // Remove tooltip if exists
        return null;
    }

    let text = event.target.value.trim();
    let errorMessages = [];

    // Check if any invalid keyword exists in the "Line 1" field
    if (addressKeywords.some(keyword => {
        // Use regex to match whole words only
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        return regex.test(text);
    })) {
        errorMessages.push("❌ Address Rule Violation: 'Line 1' of Non-Standardized addresses should not contain road types or directions!");
    }

    if (errorMessages.length > 0) {
        errorMessages.forEach(msg => {
            createTooltip(event.target, msg, false);
        });
        return errorMessages;
    }
    
    // If valid, remove any existing tooltip
    removeExistingTooltip(event.target);
    return null;
}

const ILLEGAL_CANNABIS_STATES = [
    'Georgia', 'Idaho', 'Indiana', 'Kansas', 'Kentucky',
    'North Carolina', 'Nebraska', 'South Carolina', 'Tennessee',
    'Wisconsin', 'Wyoming'
];

const CANNABIS_TRADE_CHANNEL = "[14]Cannabis";
let lastKnownState = null;

function trackState() {
    // Adjust selector to match your state input field (e.g., by name, ID, or label)
    const stateInput = document.querySelector('input[name="state"], #state, input[data-label="State"]');
    
    if (stateInput) {
        // Immediate update
        lastKnownState = stateInput.value || '';
        
        // Change listener
        stateInput.addEventListener("input", function(e) {
            lastKnownState = e.target.value || '';
            console.log("Tracking State:", lastKnownState);
            validateCannabisForRestrictedStates();
            validateMedicalCannabisRequirement();
        });
        
        // Also validate on blur
        stateInput.addEventListener("blur", validateCannabisForRestrictedStates);
        stateInput.addEventListener("blur", function() {
            validateMedicalCannabisRequirement(); // Add this line
        });
    }
}
function validateCannabisForRestrictedStates() {
    // Skip if no trade channel or state data available
    if (!lastKnownTradeChannel || !lastKnownState) return null;
    
    // Check if trade channel is Cannabis
    const isCannabisChannel = lastKnownTradeChannel.includes(CANNABIS_TRADE_CHANNEL);
    if (!isCannabisChannel) return null;

    // Normalize state name (trim and capitalize first letter)
    const normalizedState = lastKnownState.trim().replace(/^\w/, c => c.toUpperCase());
    
    // Check if state is in restricted list
    const isIllegalState = ILLEGAL_CANNABIS_STATES.includes(normalizedState);
    if (!isIllegalState) return null;

    // Find the Trade Channel input to attach the error
    const tradeChannelInput = findExtJSComboBox("Trade Channel:");
    if (!tradeChannelInput) {
        console.log("Trade Channel field not found");
        return null;
    }

    const message = `❌ Cannabis is illegal in ${normalizedState}`;
    createTooltip(tradeChannelInput, message, false);
    return message;
}
const MEDICAL_CANNABIS_STATES = [
    'Alabama', 'Arkansas', 'District of Columbia', 'Delaware',
    'Florida', 'Hawaii', 'Iowa', 'Louisiana', 'Maryland',
    'Minnesota', 'Mississippi', 'North Dakota', 'New Hampshire',
    'Oklahoma', 'Pennsylvania', 'South Dakota', 'Texas',
    'Utah', 'Virginia', 'West Virginia'
];

const MEDICAL_CANNABIS_SUBCHANNEL = "[1]Medical";
function validateMedicalCannabisRequirement() {
    // Skip if no trade channel, state, or subchannel data available
    if (!lastKnownTradeChannel || !lastKnownState || !lastKnownSubChannel) return null;
    
    // Check if trade channel is Cannabis
    const isCannabisChannel = lastKnownTradeChannel.includes(CANNABIS_TRADE_CHANNEL);
    if (!isCannabisChannel) return null;

    // Normalize state name (trim and capitalize properly)
    const normalizedState = lastKnownState.trim()
        .replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    
    // Check if state is in medical-only list
    const isMedicalOnlyState = MEDICAL_CANNABIS_STATES.includes(normalizedState);
    if (!isMedicalOnlyState) return null;

    // Check if subchannel is correct
    const isCorrectSubChannel = lastKnownSubChannel.includes(MEDICAL_CANNABIS_SUBCHANNEL);
    
    if (!isCorrectSubChannel) {
        const subChannelInput = findExtJSComboBox("Sub Channel:");
        if (!subChannelInput) {
            console.log("Sub Channel field not found");
            return null;
        }

        const message = `❌ Only "${MEDICAL_CANNABIS_SUBCHANNEL.split(']')[1]}" subchannel is allowed for Cannabis in ${normalizedState}`;
        createTooltip(subChannelInput, message, false);
        return message;
    }
    
    // Clear any existing error if validation passes
    const subChannelInput = findExtJSComboBox("Sub Channel:");
    if (subChannelInput) removeTooltip(subChannelInput);
    return null;
}

// const UNKNOWN_RETAILER_CHANNELS = [
//     "[09]Unknown Retailers",
//     "[59]Unknown On-Premise"
// ];
// const OPERATING_STATUS = "[OP] Open, Operating";
// let lastKnownPhoneNumber = '';
// let lastKnownStoreStatus = null;
// let lastKnownFutureChangesNote = '';


// function validatePhoneNumberForOperatingStores() {
//     // Skip validation if required data isn't available
//     if (!lastKnownTradeChannel || !lastKnownStoreStatus) return null;
    
//     // Check if store is operating
//     const isOperating = lastKnownStoreStatus.includes(OPERATING_STATUS);
//     if (!isOperating) return null;
    
//     // Check if trade channel is NOT unknown type
//     const isUnknownChannel = UNKNOWN_RETAILER_CHANNELS.some(channel => 
//         lastKnownTradeChannel.includes(channel)
//     );
//     if (isUnknownChannel) return null;
    
//     // Check if phone number is empty
//     if (lastKnownPhoneNumber.trim() !== "") return null;
//     if (lastKnownFutureChangesNote.trim() !== "") return null;
    
//     // Find the Future Changes Note input field (using your actual HTML structure)
//     const futureChangesInput = document.querySelector('input[name="storeNotes"]');
//     if (!futureChangesInput) {
//         console.log("Future Changes Note field not found");
//         return null;
//     }
    
//     const errorMessage = "❌ Null phone number - Need to Fix FC Phone number";
//     createTooltip(futureChangesInput, errorMessage, false);
//     return errorMessage;
// }

// function trackPhoneNumber() {
//     const phoneNumberInput = document.querySelector('input[name="phoneNumber"]');
//     if (!phoneNumberInput) {
//         console.log("Phone number field not found");
//         return;
//     }
    
//     const updatePhoneNumber = () => {
//         lastKnownPhoneNumber = phoneNumberInput.value || '';
//         validatePhoneNumberForOperatingStores();
//     };
    
//     phoneNumberInput.addEventListener("input", updatePhoneNumber);
//     phoneNumberInput.addEventListener("change", updatePhoneNumber);
    
//     // Initial update
//     updatePhoneNumber();
// }

// function trackStoreStatus() {
//     const statusInput = findExtJSComboBox("Store Status:");
//     if (statusInput) {
//         // Immediate update
//         lastKnownStoreStatus = statusInput.value || statusInput.getAttribute('data-value') || '';
        
//         // Change listener
//         statusInput.addEventListener("change", function(e) {
//             lastKnownStoreStatus = e.target.value || e.target.getAttribute('data-value') || '';
//             validatePhoneNumberForOperatingStores();
//         });
//     }
// }
// function trackFutureChangesNote() {
//     const futureChangesInput = document.querySelector('input[name="storeNotes"]');
//     if (futureChangesInput) {
//         // Immediate update
//         lastKnownFutureChangesNote = futureChangesInput.value || '';
        
//         // Change listener
//         futureChangesInput.addEventListener("input", function() {
//             lastKnownFutureChangesNote = this.value || '';
            
//             // Clear error if note is added
//             if (lastKnownFutureChangesNote.trim() !== "") {
//                 removeTooltip(futureChangesInput);
//                 // Also re-validate to prevent the error from showing
//                 validatePhoneNumberForOperatingStores();
//             } else {
//                 // If note is cleared, re-validate to potentially show error again
//                 validatePhoneNumberForOperatingStores();
//             }
//         });
        
//         futureChangesInput.addEventListener("change", function() {
//             lastKnownFutureChangesNote = this.value || '';
//             validatePhoneNumberForOperatingStores();
//         });
//     }
// }


// 🔹 Attach event listeners to inputs
function attachListeners() {
    if (validationInterval) {
        clearInterval(validationInterval);
    }

    // Start new interval
    validationInterval = setInterval(validateAllFields, VALIDATION_INTERVAL);

    let storeNameInput = findStoreNameInput();
    if (storeNameInput) {
        storeNameInput.removeEventListener("input", validateStoreName);
        storeNameInput.addEventListener("input", validateStoreName);

        storeNameInput.removeEventListener("input", validateStoreNameAndTradeChannel);
        storeNameInput.addEventListener("input", validateStoreNameAndTradeChannel);

        storeNameInput.removeEventListener("input", validatePetTradeChannelAndStoreName);
        storeNameInput.addEventListener("input", validatePetTradeChannelAndStoreName);

        storeNameInput.removeEventListener("blur", validateStoreNameAndTradeChannel);
        storeNameInput.addEventListener("blur", validateStoreNameAndTradeChannel);

        storeNameInput.removeEventListener("blur", validatePetTradeChannelAndStoreName);
        storeNameInput.addEventListener("blur", validatePetTradeChannelAndStoreName);

        storeNameInput.removeEventListener("input", validateFarmFeedSubChannelAndStoreName);
        storeNameInput.addEventListener("input", validateFarmFeedSubChannelAndStoreName);

        storeNameInput.removeEventListener("blur", validateFarmFeedSubChannelAndStoreName);
        storeNameInput.addEventListener("blur", validateFarmFeedSubChannelAndStoreName);

        storeNameInput.removeEventListener("input", validateVapeStoreSubChannelAndStoreName);
        storeNameInput.addEventListener("input", validateVapeStoreSubChannelAndStoreName);

        storeNameInput.removeEventListener("blur", validateVapeStoreSubChannelAndStoreName);
        storeNameInput.addEventListener("blur", validateVapeStoreSubChannelAndStoreName);

        storeNameInput.removeEventListener("input", validateMarketingGroupAndStoreName);
        storeNameInput.addEventListener("input", validateMarketingGroupAndStoreName);

        storeNameInput.removeEventListener("blur", validateMarketingGroupAndStoreName);
        storeNameInput.addEventListener("blur", validateMarketingGroupAndStoreName);

        storeNameInput.removeEventListener("input", validatePetSuperStoreName);
        storeNameInput.addEventListener("input", validatePetSuperStoreName);

        storeNameInput.removeEventListener("blur", validatePetSuperStoreName);
        storeNameInput.addEventListener("blur", validatePetSuperStoreName);

        storeNameInput.removeEventListener("input", validateAlcoholStoreName);
        storeNameInput.addEventListener("input", validateAlcoholStoreName);

        storeNameInput.removeEventListener("blur", validateAlcoholStoreName);
        storeNameInput.addEventListener("blur", validateAlcoholStoreName);
    }

    // Add listeners for each alcohol dropdown
    const alcoholDropdowns = ["Beer:", "Wine:", "Liquor:"];
    alcoholDropdowns.forEach(label => {
        let dropdown = findExtJSComboBox(label);
        if (dropdown) {
            dropdown.removeEventListener("change", validateAlcoholStoreName);
            dropdown.addEventListener("change", validateAlcoholStoreName);

            dropdown.removeEventListener("blur", validateAlcoholStoreName);
            dropdown.addEventListener("blur", validateAlcoholStoreName);
        }
    });
    trackTradeChannel();
    trackSubChannel();
    trackState();
    trackPhoneNumber();
    trackStoreStatus();
    trackFutureChangesNote();
    const gasInput = findExtJSComboBox("Gas:");
    if (gasInput) {
        gasInput.addEventListener("change", validateGasForGroceryStores);
        gasInput.addEventListener("blur", validateGasForGroceryStores);
    }
        const highVolCigInput = findExtJSComboBox("High Vol Cig:");
    if (highVolCigInput) {
        highVolCigInput.addEventListener("change", validateHighVolCig);
        highVolCigInput.addEventListener("blur", validateHighVolCig);
    }
    // Set up Food Type validation triggers
    const foodTypeInput = findExtJSComboBox("Food Type:");
    if (foodTypeInput) {
        foodTypeInput.addEventListener("change", validateFoodTypeRequirements);
        foodTypeInput.addEventListener("blur", validateFoodTypeRequirements);
    }
    const pharmacyInput = findExtJSComboBox("Pharmacy:");
    if (pharmacyInput) {
        pharmacyInput.addEventListener("change", validatePharmacyForDrugStores);
        pharmacyInput.addEventListener("blur", validatePharmacyForDrugStores);

        pharmacyInput.addEventListener("change", validatePharmacyForRestrictedChannels);
        pharmacyInput.addEventListener("blur", validatePharmacyForRestrictedChannels);
    }
        ALCOHOL_FIELDS.forEach(fieldName => {
        const fieldInput = findExtJSComboBox(fieldName);
        if (fieldInput) {
            fieldInput.addEventListener("change", validateAlcoholForRestrictedChannels);
            fieldInput.addEventListener("blur", validateAlcoholForRestrictedChannels);
        }
    });


    let marketingGroupInput = findMarketingGroupInput();
    if (marketingGroupInput) {
        marketingGroupInput.removeEventListener("change", validateMarketingGroupAndStoreName);
        marketingGroupInput.addEventListener("change", validateMarketingGroupAndStoreName);

        marketingGroupInput.removeEventListener("blur", validateMarketingGroupAndStoreName);
        marketingGroupInput.addEventListener("blur", validateMarketingGroupAndStoreName);

        // marketingGroupInput.removeEventListener("change", validateReportToAndMarketingGroup);
        // marketingGroupInput.addEventListener("change", validateReportToAndMarketingGroup);

        // marketingGroupInput.removeEventListener("blur", validateReportToAndMarketingGroup);
        // marketingGroupInput.addEventListener("blur", validateReportToAndMarketingGroup);
    }

    // Add separate listeners for each Unverifiable Store requirement
    Object.entries(UNVERIFIABLE_REQUIREMENTS).forEach(([fieldName, expectedValue]) => {
        let input = findExtJSComboBox(fieldName);
        if (input) {
            const validationFn = validateUnverifiableField(fieldName, expectedValue);

            // Remove existing listeners first
            input.removeEventListener("change", validationFn);
            input.removeEventListener("blur", validationFn);

            // Add new listeners
            input.addEventListener("change", validationFn);
            input.addEventListener("blur", validationFn);

            // Also validate when Store Status changes
            let storeStatusInput = findExtJSComboBox("Store Status:");
            if (storeStatusInput) {
                storeStatusInput.removeEventListener("change", validationFn);
                storeStatusInput.addEventListener("change", validationFn);
            }
        }
    });

    let line1Input = findLine1Input();
    if (line1Input) {
        storeStatusInput.removeEventListener("change", validateStoreStatusAndVSS);
        storeStatusInput.addEventListener("change", validateStoreStatusAndVSS);
        line1Input.removeEventListener("input", validateLine1Address);
        line1Input.addEventListener("input", validateLine1Address);
    }

    let storeStatusInput = findExtJSComboBox("Store Status:");
    if (storeStatusInput) {

        storeStatusInput.removeEventListener("change", validateExceptionCodeAndStoreStatus);
        storeStatusInput.addEventListener("change", validateExceptionCodeAndStoreStatus);

        storeStatusInput.removeEventListener("blur", validateStoreStatusAndVSS);
        storeStatusInput.addEventListener("blur", validateStoreStatusAndVSS);

        storeStatusInput.removeEventListener("blur", validateExceptionCodeAndStoreStatus);
        storeStatusInput.addEventListener("blur", validateExceptionCodeAndStoreStatus);

        storeNameInput.removeEventListener("input", validateVetClinicSubChannelAndStoreName);
        storeNameInput.addEventListener("input", validateVetClinicSubChannelAndStoreName);

        storeNameInput.removeEventListener("blur", validateVetClinicSubChannelAndStoreName);
        storeNameInput.addEventListener("blur", validateVetClinicSubChannelAndStoreName);

        storeStatusInput.removeEventListener("change", validateDuplicateStoreStatusAndExceptionCode);
        storeStatusInput.addEventListener("change", validateDuplicateStoreStatusAndExceptionCode);

        storeStatusInput.removeEventListener("blur", validateDuplicateStoreStatusAndExceptionCode);
        storeStatusInput.addEventListener("blur", validateDuplicateStoreStatusAndExceptionCode);
    }

    let verifiedStatusInput = findExtJSComboBox("Verified Store Status Source:");
    if (verifiedStatusInput) {
        verifiedStatusInput.removeEventListener("change", validateStoreStatusAndVSS);
        verifiedStatusInput.addEventListener("change", validateStoreStatusAndVSS);

        verifiedStatusInput.removeEventListener("blur", validateStoreStatusAndVSS);
        verifiedStatusInput.addEventListener("blur", validateStoreStatusAndVSS);
    }

    let exceptionCodeInput = findExtJSComboBox("Exception Code:");
    if (exceptionCodeInput) {
        exceptionCodeInput.removeEventListener("change", validateExceptionCodeAndStoreStatus);
        exceptionCodeInput.addEventListener("change", validateExceptionCodeAndStoreStatus);

        exceptionCodeInput.removeEventListener("blur", validateExceptionCodeAndStoreStatus);
        exceptionCodeInput.addEventListener("blur", validateExceptionCodeAndStoreStatus);

        exceptionCodeInput.removeEventListener("change", validateDuplicateStoreStatusAndExceptionCode);
        exceptionCodeInput.addEventListener("change", validateDuplicateStoreStatusAndExceptionCode);

        exceptionCodeInput.removeEventListener("blur", validateDuplicateStoreStatusAndExceptionCode);
        exceptionCodeInput.addEventListener("blur", validateDuplicateStoreStatusAndExceptionCode);
    }

    let tradeChannelInput = findExtJSComboBox("Trade Channel:");
    if (tradeChannelInput) {
        // tradeChannelInput.removeEventListener("change", validateTradeChannelAndReportTo);
        // tradeChannelInput.addEventListener("change", validateTradeChannelAndReportTo);

        tradeChannelInput.removeEventListener("change", validateTradeChannelAndStoreStatus);
        tradeChannelInput.addEventListener("change", validateTradeChannelAndStoreStatus);

        tradeChannelInput.removeEventListener("change", validateStoreNameAndTradeChannel);
        tradeChannelInput.addEventListener("change", validateStoreNameAndTradeChannel);

        // tradeChannelInput.removeEventListener("blur", validateTradeChannelAndReportTo);
        // tradeChannelInput.addEventListener("blur", validateTradeChannelAndReportTo);

        tradeChannelInput.removeEventListener("blur", validateTradeChannelAndStoreStatus);
        tradeChannelInput.addEventListener("blur", validateTradeChannelAndStoreStatus);

        tradeChannelInput.removeEventListener("blur", validateStoreNameAndTradeChannel);
        tradeChannelInput.addEventListener("blur", validateStoreNameAndTradeChannel);

        tradeChannelInput.removeEventListener("change", validatePetTradeChannelAndStoreName);
        tradeChannelInput.addEventListener("change", validatePetTradeChannelAndStoreName);

        tradeChannelInput.removeEventListener("blur", validatePetTradeChannelAndStoreName);
        tradeChannelInput.addEventListener("blur", validatePetTradeChannelAndStoreName);

                tradeChannelInput.addEventListener("change", validateCannabisForRestrictedStates);
        tradeChannelInput.addEventListener("blur", validateCannabisForRestrictedStates);


        // Add change listener for Trade Channel

    }

    // let immediateReportToInput = findExtJSComboBox("Immediate Report To:");
    // if (immediateReportToInput) {
    //     immediateReportToInput.removeEventListener("change", validateTradeChannelAndReportTo);
    //     immediateReportToInput.addEventListener("change", validateTradeChannelAndReportTo);

    //     immediateReportToInput.removeEventListener("blur", validateTradeChannelAndReportTo);
    //     immediateReportToInput.addEventListener("blur", validateTradeChannelAndReportTo);

    //     immediateReportToInput.removeEventListener("change", validateReportToAndMarketingGroup);
    //     immediateReportToInput.addEventListener("change", validateReportToAndMarketingGroup);

    //     immediateReportToInput.removeEventListener("blur", validateReportToAndMarketingGroup);
    //     immediateReportToInput.addEventListener("blur", validateReportToAndMarketingGroup);
    // }

    let subChannelInput = findExtJSComboBox("Sub Channel:");
    if (subChannelInput) {
        subChannelInput.removeEventListener("change", validateVetClinicSubChannelAndStoreName);
        subChannelInput.addEventListener("change", validateVetClinicSubChannelAndStoreName);

        subChannelInput.removeEventListener("blur", validateVetClinicSubChannelAndStoreName);
        subChannelInput.addEventListener("blur", validateVetClinicSubChannelAndStoreName);

        subChannelInput.removeEventListener("change", validateFarmFeedSubChannelAndStoreName);
        subChannelInput.addEventListener("change", validateFarmFeedSubChannelAndStoreName);

        subChannelInput.removeEventListener("blur", validateFarmFeedSubChannelAndStoreName);
        subChannelInput.addEventListener("blur", validateFarmFeedSubChannelAndStoreName);

        subChannelInput.removeEventListener("change", validateVapeStoreSubChannelAndStoreName);
        subChannelInput.addEventListener("change", validateVapeStoreSubChannelAndStoreName);

        subChannelInput.removeEventListener("blur", validateVapeStoreSubChannelAndStoreName);
        subChannelInput.addEventListener("blur", validateVapeStoreSubChannelAndStoreName);

        subChannelInput.removeEventListener("change", validatePetSuperStoreName);
        subChannelInput.addEventListener("change", validatePetSuperStoreName);

        subChannelInput.removeEventListener("blur", validatePetSuperStoreName);
        subChannelInput.addEventListener("blur", validatePetSuperStoreName);
    }


}

// 🔹 Observe dynamic content
function startObserver() {
    attachListeners();
    trackTradeChannel();

    const observer = new MutationObserver(() => {
        attachListeners();
        trackTradeChannel();
        trackSubChannel();
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

// Run on page load
document.addEventListener("DOMContentLoaded", startObserver);
document.addEventListener("click", attachListeners);
