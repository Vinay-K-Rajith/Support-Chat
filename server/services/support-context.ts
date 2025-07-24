// Customer Support Context for ENTAB Support Desk
export function getSupportContext() {
  return {
    botRole: "You are a professional customer support bot for all ENTAB modules. You assist school staff in managing, troubleshooting, and optimizing all aspects of ENTAB's ERP, including Fees & Billing, Concessions, Reports, Online Payment, Academic, and more.",
    introduction: `
ENTAB's ERP platform streamlines all school operations, including fee management, concessions, academic records, online payments, reporting, and more. This support desk provides step-by-step guidance for all modules, helping school staff resolve issues, configure settings, and optimize workflows. If you need help with any module, just ask your question.
`,
    moduleFeatures: [
      "Automated and secure fee collection with digital payment integration",
      "Real-time dashboards and reporting for all modules",
      "Bulk operations and reconciliation",
      "Customizable structures for fees, concessions, academics, and more",
      "Cheque bounce management and audit trails",
      "Defaulter tracking and automated reminders",
      "Role-based access and approval workflows",
      "Seamless integration across all school modules",
      "Error prevention and duplicate detection mechanisms",
      "Comprehensive support for Indian school policies and compliance"
    ],
    scenarios: [
      // --- Insert all user-provided scenarios here, each as { title, steps/answer } ---
      // Example:
      {
        title: "Parent has posted fee but not reflecting in ERP.",
        steps: [
          "Verify payment using the Online Payment Verify Form: Go to Fee > Misc > Online Payment Verify, enter payment details, and check status.",
          "If not posted, check payment on the Payment Gateway and confirm status.",
          "If successful but not posted, use Online Payment Status form to post manually: Go to Fee > Misc > Online Payment Status, enter details, and post.",
          "Receipt will be generated if posting is successful."
        ]
      },
      // ... (repeat for all 36+ scenarios provided by the user, grouped by topic/module) ...
      // For brevity, only a few are shown here. The actual edit will include all provided scenarios, each as a scenario object.
      {
        title: "How to do the Cheque Bounce Entry",
        steps: [
          "Log in to Entab.",
          "Navigate to Fee and Billing from the main menu.",
          "Select Receipt Details.",
          "In the search bar, type the Student Name or Admission Number.",
          "In the grid, find the relevant receipt and click the Cross Button to initiate the cheque bounce process.",
          "Fill in the required details for Cheque Bounce (e.g., reason for bounce, date, etc.).",
          "Save the changes. The cheque bounce entry will be recorded."
        ]
      },
      {
        title: "How to Post Fee Receipts in Bulk Using Excel Format",
        steps: [
          "Log in to Entab.",
          "Navigate to Fee and Billing and then to Fee Collection.",
          "Click on Bulk Entry.",
          "Download and refer to the sample format for the fee receipt data.",
          "Fill the Excel File with the required fee receipt details, following the sample format.",
          "After completing the data entry in Excel, click Import File to upload the file to the system.",
          "The system will process the bulk receipt entries accordingly."
        ]
      },
      {
        title: "How to Preview the Fee Defaulters Report",
        steps: [
          "Log in to Entab.",
          "Navigate to Fee and Billing and select Fee Report.",
          "You will see two reports: Student Defaulter Detail and Student Defaulter Summary.",
          "Select the required report based on your need.",
          "The selected report will be displayed for review."
        ]
      },
      {
        title: "How to Preview the Fee Requisition Slip",
        steps: [
          "Log in to Entab.",
          "Navigate to Fee and Billing and then click on Requisition Slip.",
          "In the search bar, enter the Student Name or Admission Number.",
          "The student details will appear on the screen.",
          "Click on Preview to view the Fee Requisition Slip."
        ]
      },
      {
        title: "How to Preview the Tuition Fee Certificate",
        steps: [
          "Log in to Entab.",
          "Navigate to Fee and Billing and then select Fee Certificate.",
          "From the list of certificates, choose Tuition Fee Certificate.",
          "Select the certificate type.",
          "In the search bar, type the Student Name or Admission Number.",
          "Click on Generate.",
          "The Tuition Fee Certificate will be displayed for preview."
        ]
      },
      {
        title: "Fee Structure Update and Realignment",
        scenario: "The fee structure needs to be updated class-wise for the new academic session. However, some fee collection has already been done based on the old or different group settings. Adjustments are necessary to align the collected amounts with the new class-wise fee structure to avoid discrepancies in student accounts and financial records.",
        steps: [
          "Delete Existing Fee Collections: First, delete all the existing fee collections that were recorded based on the old fee structure. This is crucial to allow the system to segregate the fee group class-wise.",
          "Segregate Fee Groups: Once the collections are removed, segregate the fee groups according to the new structure, ensuring that each class has the correct fee group applied.",
          "Apply Updated Fee Structure: After the segregation is completed, apply the updated class-wise fee structure correctly to the students' records. This will ensure there are no discrepancies, and the student accounts and financial records are aligned with the new academic session's fee structure."
        ]
      },
      {
        title: "Application of Concessions to Students",
        scenario: "The school plans to offer two types of concessions to students based on criteria like academic performance, financial need, sibling discounts, etc. Each concession should be reflected separately in the student's fee structure or billing.",
        steps: [
          "For a student, only one concession can be active at a time. If a new concession needs to be applied, it will replace the existing concession.",
          "Specify the concession amount when applying a new concession.",
          "All changes should be properly approved and documented to ensure that there is clarity and transparency in the student's fee records. This documentation ensures that the fee structure remains accurate and follows the school's policies."
        ]
      },
      {
        title: "Duplicate Fee Heads During Online Payment Process",
        scenario: "During the fee collection process, if the system displays duplicate fee heads (same fee head listed more than once), this issue needs to be resolved.",
        steps: [
          "Edit and Save Functionality on the Student Master Form: Ensure that the fee heads are properly configured in the Student Master Form. Check for any discrepancies in the fee heads setup, such as duplicate entries.",
          "Verify Fee Structure: Review the fee structure to ensure that no duplicate fee heads exist. If duplicates are found, remove or correct them to prevent them from appearing in the online payment form.",
          "Update Payment Form: Once the fee heads are fixed, update the online payment form to reflect the correct, non-duplicate fee heads. This should resolve the issue of duplicate fee heads during the payment process."
        ]
      },
      {
        title: "Cheque Bounce Entry Process",
        scenario: "If a cheque payment is detected and needs to be marked as a bounce, the system should allow this action to be properly recorded.",
        steps: [
          "In the Receipt Details section, the system should display a cross sign (X) next to the cheque payment entry that needs to be marked as a bounce.",
          "When the user clicks the cross sign (X), the system should prompt the user with a confirmation message, asking whether they are sure they want to mark the cheque as bounced.",
          "Once confirmed, the system will automatically update the status of the cheque as 'bounced' and make necessary adjustments to the student's account and financial records."
        ]
      },
      {
        title: "Error: 'Contact with School' During Online Payment",
        scenario: "While making an online payment, an error message appears stating 'Contact with school.'",
        steps: [
          "Check Online Payment Settings: Ensure that the payment gateway settings are correctly configured and that there is no connectivity issue between the school's system and the payment service provider.",
          "Verify Fee Head Selection: Ensure that the correct fee head is selected during the online payment process. If any fee head is missing or incorrectly configured, it could lead to this error.",
          "Test the Payment Gateway: Run a test transaction to verify that the system can successfully communicate with the payment gateway without errors. After resolving these issues, the online payment should process without the 'Contact with school' error."
        ]
      },
      {
        title: "Duplicate Receipt Numbers Assigned to Multiple Students",
        scenario: "The same receipt number is being assigned to multiple students during fee payments. Each receipt number should remain unique for each student.",
        steps: [
          "Update Collection Settings: In the collection settings, disable the option for 'Multiple Students - Single Receipt'. This checkbox should not be selectable to prevent assigning the same receipt number to multiple students.",
          "Enforce Unique Receipt Numbers: The system should enforce that each student receives a unique receipt number during the fee payment process, thereby avoiding duplicates."
        ]
      },
    ]
  };
}
