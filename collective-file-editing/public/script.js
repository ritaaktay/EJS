//HTML DOM Elements 
let form = document.querySelector("form")
let select = document.querySelector('select')
let def = document.querySelector('#default')
let textarea = document.querySelector('textarea')
let filename = document.querySelector('input')

//Buttons
let create = document.querySelector('#create')
let del = document.querySelector('#delete')
let edit = document.querySelector('#edit')

//Feedback
let feedbackNode = document.querySelector("#feedback")
let feedback = document.createTextNode("")
feedbackNode.appendChild(feedback)

//PATH constant for files folder on server
const PATH = "./files"

//SYNC FUNCTIONS 

//syncs <select> options with directory, updates value to file on file creation, 
//and calls syncTextarea() to update <textarea> contents 
function sync(name) {
    let options = Array.from(select.options)
    let values = options.map(o => o.value)
    fetch(PATH, {method: "GET"})
    //sync option nodes with directory both ways 
    .then(resp => resp.json()).then(directory => {
        //adds options at start & for put requests
        for (let file of directory) {
            if (values.find(v => v == file)) continue;
            else {
                let option = document.createElement("option")
                //<option> value stores filename with extension
                //<option> text shows filename without extension
                option.value = file
                option.text = file.split(".")[0]
                select.appendChild(option)
            }
        }
        //removes redundant options for delete requests
        for (let value of values) {
            if (value=="default" || directory.find(file => file == value)) continue;
            else {
                let option = options.filter(o => o.value == value).pop()
                option.remove()
            }
        }
    })
    .then(() => {
        //need to update options binding to include added nodes!
        options = Array.from(select.options)
        //for delete requests select default
        if (name == "default") def.selected = true
        //for edit requests leave selected
        else if (name == null) select.value = select.value
        //for create request select created
        else options.find(o => o.text == name).selected = true
        //updates textarea
        syncTextarea()
    })
}
//calls sync once to load with existing files
sync("default")

//updates <textarea> to the selected file contents 
function syncTextarea() {
    if (select.value != "default") {
        let file = PATH.concat("/").concat(select.value)
        fetch(file, {method: "GET"}, {headers: {"Accept": "text/plain"}})
        .then(res => res.text()).then(text => {
            //enables text area if moving to file from default
            textarea.disabled = false
            textarea.value = text
        })
    } else {
        //for default option textarea is empty and disabled
        textarea.disabled = true
        textarea.value = null
    }
}

//EVENT LISTENERS 

//keeps <textarea> contents synced on user interaction with <select>
select.addEventListener("change", syncTextarea)

//calls handler function for submitting button
form.addEventListener("submit", (event) => {
    event.preventDefault()
    let sub = event.submitter.value
    let handler = requests[sub]
    handler(event)
})

//HANDLER FUNCTIONS

//requests object stores functions with keys that match button values
let requests = {}

//makes PUT request to create file and syncs
requests.create = function(event) {
    //checks for valid filename 
    let input = filename.value, regexp = new RegExp("[\\W]")
    let message = "Special characters and spaces are not allowed in file names."
    if (regexp.test(input)) feedback.nodeValue = message
    else if (Array.from(select.options).find(o => o.text == input)) {
        message = "File already exists."
        feedback.nodeValue = message
    } else {
        //clears feedback on correct file name format
        feedback.nodeValue = ""
        file = PATH.concat("/").concat(filename.value).concat(".txt")
        fetch(file, {method: "PUT"})
        //calls sync() with filename so it knows which option 
        //to select after syncing from server with new files
        .then(sync(input))
    }
    //clears <input> after creating file
    filename.value = null
}

//makes DELETE request to delete file and syncs
requests.del = function(event){
    let file = (PATH).concat("/").concat(select.value)
    fetch(file, {method: "DELETE"})
    .then(()=> {
        sync("default")
    })
}

//makes PUT request to overwrite file and syncs
requests.edit = function(event) {
    let file = PATH.concat("/").concat(select.value)
    fetch(file, {method: "PUT", body: textarea.value})
    //calls sync with no arg so select.value is not updated
    .then(sync())
}