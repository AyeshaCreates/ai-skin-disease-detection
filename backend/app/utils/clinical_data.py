from typing import List

def get_clinical_explanation(disease: str) -> str:
    explanations = {
        "Melanoma": (
            "Melanoma is a serious form of skin cancer that begins in cells known as melanocytes. "
            "It is characterized by irregular borders, asymmetry, and color variation within a single lesion. "
            "Early detection is crucial as it has a high propensity to metastasize to other organs."
        ),
        "Melanocytic Nevus": (
            "A melanocytic nevus (commonly known as a mole) is a benign proliferation of melanocytes. "
            "These lesions are typically symmetrical, round or oval-shaped, with regular borders and a uniform color. "
            "They are extremely common and benign, requiring no medical intervention unless changes are observed."
        ),
        "Atopic Dermatitis (Eczema)": (
            "Atopic dermatitis is a chronic, pruritic (itchy) inflammatory skin disease. "
            "It commonly manifests as red, dry, flaky patches, especially in flexural creases (elbows/knees). "
            "It is associated with an overactive immune response and skin barrier dysfunction."
        ),
        "Seborrheic Keratosis": (
            "Seborrheic keratosis is a very common, benign skin tumor that appears as a 'stuck-on' waxy or scaly plaque. "
            "They range in color from tan to dark brown and typically have a granular surface. "
            "They are completely non-cancerous and usually removed only for aesthetic reasons or if irritated."
        ),
        "Acne Vulgaris": (
            "Acne vulgaris is a common inflammatory dermatosis of the pilosebaceous units. "
            "It is caused by sebum overproduction, follicular hyperkeratinization, and bacterial colonization by C. acnes. "
            "It presents as comedones (blackheads/whiteheads), papules, and pustules on sebum-rich areas like the face."
        ),
        "Basal Cell Carcinoma": (
            "Basal cell carcinoma (BCC) is the most common type of skin cancer. "
            "It originates in the basal cells of the epidermis, typically on sun-exposed areas. "
            "It often presents as a shiny pearly pink nodule with visible tiny blood vessels (telangiectasias), "
            "rolled borders, and sometimes central ulceration or crusting."
        ),
        "Psoriasis": (
            "Psoriasis is a chronic autoimmune skin condition that accelerates the life cycle of skin cells. "
            "This rapid turnover leads to cells building up rapidly on the surface of the skin. "
            "It presents as thick red plaques covered with silvery scales, commonly on elbows, knees, scalp, and torso."
        ),
        "Vitiligo": (
            "Vitiligo is a long-term skin condition characterized by patches of the skin losing their pigment. "
            "It occurs when melanocytes (cells responsible for skin color) are destroyed by the body's immune system, "
            "resulting in flat, depigmented milky-white spots with sharp, distinct margins."
        ),
        "Rosacea": (
            "Rosacea is a chronic inflammatory skin condition that primarily affects the face. "
            "It causes persistent redness, flushing, and visible small blood vessels (telangiectasias), "
            "often accompanied by small red pus-filled papules resembling acne."
        ),
        "Tinea Corporis (Ringworm)": (
            "Tinea corporis is a superficial fungal infection of the body skin. "
            "It is caused by dermatophyte fungi and typically presents as an itchy, circular ring-like rash "
            "with elevated, scaly red borders and a relatively clear center."
        ),
        "Impetigo": (
            "Impetigo is a highly contagious superficial bacterial skin infection, common in children. "
            "It is caused by Staph or Strep bacteria and is characterized by honey-colored crusted sores "
            "that form around the nose, lips, and extremities."
        ),
        "Urticaria (Hives)": (
            "Urticaria (commonly known as hives) is a vascular skin reaction characterized by transient wheals. "
            "It presents as raised, severely itchy red or skin-colored welts that appear and fade rapidly, "
            "triggered by allergic responses, physical stimuli, or systemic stress."
        ),
        "Warts": (
            "Warts are benign epidermal growths caused by infection with the Human Papillomavirus (HPV). "
            "They present as rough, elevated skin-colored papules with a cauliflower-like texture, "
            "often containing small black dots representing clotted capillary vessels."
        ),
        "Contact Dermatitis": (
            "Contact dermatitis is an acute or chronic localized skin inflammation. "
            "It is triggered by direct exposure to allergens (poison ivy, nickel) or irritants (soaps, acids), "
            "presenting as an itchy, red rash with vesicles or scaling localized to the contact area."
        ),
        "Folliculitis": (
            "Folliculitis is an inflammatory condition of the hair follicles, typically due to bacterial or fungal infection. "
            "It presents as small, itchy, pus-filled pimples centered around hair shafts, commonly occurring on "
            "shaved or friction-prone areas like the face, scalp, and thighs."
        ),
        "Lichen Planus": (
            "Lichen planus is a chronic autoimmune condition affecting the skin and mucous membranes. "
            "It presents as shiny, polygonal, flat-topped violaceous (purple) papules that are intensely itchy "
            "and show fine white lacy lines known as Wickham's striae."
        ),
        "Herpes Zoster": (
            "Herpes zoster (commonly known as shingles) is a painful viral infection caused by the reactivation of "
            "the Varicella-Zoster virus (chickenpox). It presents as a painful, unilateral band-like rash "
            "of grouped fluid-filled blisters along a specific sensory nerve path (dermatome)."
        ),
        "Pityriasis Rosea": (
            "Pityriasis rosea is an acute, self-limiting inflammatory skin eruption. "
            "It begins with a single larger oval 'herald patch' on the torso, followed by a widespread breakout "
            "of smaller scaly pink oval spots aligned along skin cleavage lines in a 'Christmas tree' pattern."
        )
    }
    return explanations.get(disease, "A skin lesion displaying clinical features typical of the predicted class.")

def get_confidence_aware_recommendations(disease: str, confidence: float, severity: str) -> List[str]:
    """Returns clinical guidelines customized based on classification confidence and severity."""
    # Base Precautions
    base_precautions = {
        "Melanoma": [
            "Schedule an urgent face-to-face biopsy and clinical exam with a board-certified dermatologist.",
            "Avoid scratching, scrubbing, or picking at the lesion to prevent bleeding or secondary infection.",
            "Perform monthly self-skin examinations using the ABCDE guidelines.",
            "Use broad-spectrum SPF 50+ sunscreen daily and protect the area from direct solar radiation."
        ],
        "Melanocytic Nevus": [
            "No immediate treatment is required as this is a benign mole.",
            "Monitor the mole monthly for changes in asymmetry, borders, color, diameter, or evolution (ABCDEs).",
            "Take baseline photographs with a reference object (like a coin) to track size changes over time.",
            "Seek evaluation if the mole starts itching, bleeding, or growing rapidly."
        ],
        "Atopic Dermatitis (Eczema)": [
            "Apply a thick, fragrance-free emollient or moisturizer within 3 minutes after bathing.",
            "Use mild, soap-free skin cleansers and avoid hot showers which dry out the skin barrier.",
            "Identify and avoid triggers (e.g. harsh soaps, wool clothing, stress, allergens).",
            "Consult a physician regarding short-term topical corticosteroid or immunomodulator therapy."
        ],
        "Seborrheic Keratosis": [
            "This is a benign growth. Medical removal is optional and only needed if it gets irritated by clothing.",
            "Avoid trying to pick, scratch, or peel the lesion off, as this can lead to scarring or infection.",
            "Apply basic moisturizers if the lesion feels dry or itchy.",
            "Get evaluated if the lesion grows rapidly, bleeds, or changes color."
        ],
        "Acne Vulgaris": [
            "Wash your face twice daily with a gentle, non-comedogenic cleanser.",
            "Incorporate over-the-counter active agents such as Salicylic Acid or Benzoyl Peroxide.",
            "Avoid picking or squeezing pimples, as this worsens inflammation and leads to permanent scarring.",
            "Consult a doctor for prescription-strength retinoids or topical antibiotics if condition persists."
        ],
        "Basal Cell Carcinoma": [
            "Schedule a clinical evaluation with a dermatologist for a biopsy and potential excision.",
            "Protect the lesion and your surrounding skin from UV exposure with SPF 50+ sunscreen.",
            "Avoid picking or scratching the crusted center, as BCCs bleed easily.",
            "Ensure regular full-body skin screening to monitor for new lesions."
        ],
        "Psoriasis": [
            "Apply rich moisturizing creams or ointments daily to maintain the skin barrier.",
            "Avoid scrubbing plaques or peeling scales off, as this can trigger new lesions (Koebner phenomenon).",
            "Incorporate mild exposure to sunlight, as controlled UV light can improve plaque symptoms.",
            "Consult a physician about topical treatments (corticosteroids, salicylic acid) or systemic therapies."
        ],
        "Vitiligo": [
            "Protect depigmented skin areas from sunburn using SPF 50+ broad-spectrum sunscreen.",
            "Consult a dermatologist regarding phototherapy (NB-UVB) or topical corticosteroid treatment.",
            "Avoid skin trauma or friction, as depigmentation can occur at injured sites (Koebner response).",
            "Seek psychological support if the patches cause cosmetic distress or anxiety."
        ],
        "Rosacea": [
            "Identify and avoid triggers such as spicy foods, alcohol, hot beverages, and extreme temperatures.",
            "Apply a gentle, non-chemical mineral sunscreen (zinc oxide/titanium dioxide) daily.",
            "Use mild, non-abrasive facial cleansers and avoid scrubbing or rubbing the skin.",
            "Consult a physician about topical metronidazole, azelaic acid, or oral antibiotics for persistent bumps."
        ],
        "Tinea Corporis (Ringworm)": [
            "Apply an over-the-counter topical antifungal cream (terbinafine, clotrimazole) 1-2 inches beyond the active border.",
            "Keep the affected skin clean and completely dry, especially in hot or humid environments.",
            "Avoid sharing towels, clothing, or personal items to prevent spreading the fungal infection.",
            "Seek evaluation if the circular rash spreads or fails to improve after 2 weeks of antifungal treatment."
        ],
        "Impetigo": [
            "Keep the sores clean by washing gently with mild soap and running water, then cover them loosely.",
            "Avoid touching, scratching, or picking the honey-colored crusts to prevent auto-inoculation.",
            "Wash hands thoroughly after touching the affected areas; wash linens and clothes separately.",
            "Consult a physician for prescription topical mupirocin ointment or oral antibiotics."
        ],
        "Urticaria (Hives)": [
            "Take an over-the-counter non-drowsy antihistamine to reduce itching and swelling.",
            "Apply cool compresses or take a cool bath to soothe the inflamed welts.",
            "Avoid hot water, tight clothing, and known triggers (certain foods or medicines).",
            "Seek emergency medical care immediately if hives are accompanied by difficulty breathing or facial swelling."
        ],
        "Warts": [
            "Avoid picking, scratching, or biting warts, as HPV can spread to other areas of your skin.",
            "Keep warts clean and dry; wash hands thoroughly after touching a lesion.",
            "Do not share emery boards, pumice stones, or nail clippers used on warts.",
            "Consult a healthcare professional regarding cryotherapy, salicylic acid treatments, or laser removal."
        ],
        "Contact Dermatitis": [
            "Wash the skin immediately with copious water if contact with a suspected irritant or allergen is recognized.",
            "Apply cool compresses and calamine lotion to relieve localized itching.",
            "Use fragrance-free moisturizers and avoid contact with the inciting substance.",
            "Consult a physician if rash is extensive, painful, or does not improve within a week."
        ],
        "Folliculitis": [
            "Wash the area twice daily with an antibacterial soap or wash.",
            "Avoid shaving or waxing the affected area until the pustules have cleared.",
            "Wear loose, breathable clothing to minimize friction and sweat buildup.",
            "Consult a doctor if the folliculitis spreads, turns into a boil, or fails to resolve."
        ],
        "Lichen Planus": [
            "Avoid scratching or rubbing the purple bumps to prevent secondary bacterial infection.",
            "Use mild, soap-free body washes and apply thick emollients to calm the skin.",
            "Consult a dermatologist regarding topical corticosteroids or phototherapy.",
            "Perform regular oral checks if you experience purple rashes, as Lichen Planus can affect oral mucosa."
        ],
        "Herpes Zoster": [
            "Seek immediate medical evaluation (within 72 hours of rash onset) to start antiviral therapy.",
            "Keep the fluid-filled blisters clean and dry; cover them with a sterile, non-stick dressing.",
            "Wear loose-fitting clothing to minimize pain and friction over the active nerve path.",
            "Avoid contact with pregnant women, infants, and immunocompromised individuals who haven't had chickenpox."
        ],
        "Pityriasis Rosea": [
            "Reassure yourself that this is a benign, self-limiting condition that typically resolves in 6-8 weeks.",
            "Take lukewarm oatmeal baths and apply calamine lotion to soothe any itching.",
            "Avoid vigorous exercise and hot showers, as body heat can temporarily worsen the pink spots.",
            "Consult a doctor if the diagnosis is uncertain or if itching is severe."
        ]
    }
    
    precautions = base_precautions.get(disease, ["Consult a medical professional for advice."]).copy()
    
    # Calibrated Confidence Categories
    if confidence < 0.70:
        return [
            "WARNING: The AI system has LOW CONFIDENCE in this prediction.",
            "The diagnostic findings are highly uncertain. Please upload a clearer image or consult a qualified dermatologist.",
            "Do not rely on this prediction as a confirmed diagnosis.",
            "Avoid starting any self-treatments or topical medications without a professional prescription."
        ]
    elif confidence < 0.90:
        monitoring_tips = [
            "NOTE: The AI prediction is moderately confident. We recommend careful monitoring.",
            "Track this lesion closely over the next 2-4 weeks. Take weekly photographs under identical lighting.",
            "If you notice any rapid growth, color changes, or bleeding, consult a dermatologist immediately."
        ]
        return monitoring_tips + precautions
    else:
        # High confidence
        return ["CONFIRMED PREDICTION: The AI system is highly confident in this analysis (High Confidence >= 90%)."] + precautions
