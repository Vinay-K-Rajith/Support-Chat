export function getSchoolContext() {
  return {
    school: {
      name: "St. Xavier's School, Bathinda",
      established: 1983,
      affiliation: "Society of Pilar, Punjab - Haryana (branch of Society of Pilar, GOA)",
      curriculum: "Central Board of Secondary Education (CBSE), Delhi",
      mediumOfInstruction: "English",
      additionalLanguages: ["Punjabi", "Hindi", "Sanskrit"],
      email: "contactsaintxaviersbathinda@gmail.com",
      website: "www.xavierbathinda.com",
      transportation: "Not provided by school"
    },
    admissions2025_2026: {
      classes: {
        nursery: {
          ageEligibility: "DOB from 01.04.2021 to 31.03.2022",
          note: "Candidate will NOT be eligible if outside specified age limit"
        },
        lkg: {
          ageEligibility: "DOB from 01.04.2020 to 31.03.2021",
          note: "Candidate will NOT be eligible if outside specified age limit"
        }
      },
      registrationFee: "Rs. 1000/- (non-refundable)",
      selectionProcess: "Draw of lots (conducted online)",
      priorities: [
        "Children of Staff Members (if basic criteria fulfilled)",
        "Christian Minority community children",
        "Other applications by draw of lots"
      ]
    },
    requiredDocuments: {
      essential: [
        "Date of Birth Certificate (Municipal Corporation issued)",
        "Baptism Certificate (for Christian children only)",
        "Parents' Qualification Certificates and Aadhaar Card",
        "Proof of residence (any one of the following)"
      ],
      proofOfResidence: [
        "Voter ID Card",
        "Electricity Bill",
        "Aadhaar Card",
        "Ration Card",
        "Passport",
        "Rent Deed (if staying on rent)"
      ],
      photographs: {
        requirements: [
          "Latest photograph of candidate (taken within one month)",
          "Individual photographs of both parents",
          "Family photograph (showing both parents and candidate)",
          "Red background, JPG format, size less than 20KB"
        ]
      },
      attestation: "All photocopies must be attested by Class A Gazetted Officer only (No Notary attested copies accepted)",
      singleParent: {
        divorce: "Divorce Decree",
        separated: "Legal Separation Document",
        widowWidower: "Death Certificate of spouse",
        adoption: "Adoption Decree"
      }
    },
    feeStructure: {
      note: "Fee structure available on school website www.xavierbathinda.com",
      rules: [
        "Initial payment at admission in cash/online",
        "Caution money refundable when pupil leaves (after due deductions)",
        "Fees once paid are not refundable",
        "Penalty for delay in payment",
        "School reserves right to modify/enhance fees by minimum 10% annually",
        "One month notice required for withdrawal"
      ]
    },
    academicInfo: {
      gradingSystem: {
        "91-100": "A1 (10.0)",
        "81-90": "A2 (9.0)",
        "71-80": "B1 (8.0)",
        "61-70": "B2 (7.0)",
        "51-60": "C1 (6.0)",
        "41-50": "C2 (5.0)",
        "33-40": "D (4.0)",
        "21-32": "E1",
        "00-20": "E2"
      },
      promotionCriteria: "Minimum D grade in each subject required for promotion",
      subjects: ["Computer Science", "Classical Dance", "Music", "Punjabi", "Hindi", "Sanskrit"]
    },
    importantNotes: [
      "Only one form per candidate accepted",
      "Duplicate forms will be rejected",
      "School does not accept donations for admissions",
      "Be aware of third parties making false claims",
      "NEP 2020 implementation may require additional fees",
      "School not responsible if candidate found underage as per NEP 2020"
    ]
  };
}
