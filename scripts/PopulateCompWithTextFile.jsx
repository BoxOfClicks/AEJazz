﻿// PopulateCompWithTextFile.jsx
//
// This script reads a user specified csv file and
// creates a duplicate of the selected comp for each line of text,
// automatically populating the text inside.
//
// To use:
// 1. Create a CSV file with column headings matching the name of text fields you will later create in After Effects.
//      There are reserved headings 'in' and 'out' which set the in and out points of
//      the duplicated comps as they go. Timecodes are in seconds.
// 2. Go into After Effects and create a composition that you wish to replicate.
// 3. Design the comp, create one or more text fields to be automatically populated.
// 4. Ensure the label name of your text field(s) matches the headings in your CSV file. I would recommend avoiding
//      spaces, special characters etc.
// 5. Select the comp in the project panel and be sure that it has focus. Go to File->Scripts->Run Script File... and run this file.
// 6. A dialogue box will then ask for the CSV file you created earlier.
//
// 7. This should have now produced a comp called '_auto_generated_text_comp' and a corresponding folder. 
//      Feel free to treat this as a normal composition - either copy the contents or put the entire comp into a composition of your own.
//      If you wish to update the text at a later date and preserve the linking please do NOT rename the auto generated compositions.
//
// 8. To update the text (Perhaps your CSV file has additional or changed entries), repeat steps 5 & 6. If all goes well
//      anywhere you have used the previously generated comps will be automatically updated.
//
// NOTES:
// There are currently some hard coded elements that have aided in my own tasks. You can customise them here or else please 
// contribute to the github project. Currently if your comp contains a layer named 'background' it will attempt to resize it to the size
// of the populated text field. The paddings for that are all hard-coded (see lines approx. 200-230). If you don't want this to happen
// simply rename your layer to something other than background or change this code.
// The background sizing is also currently programmed for just one text layer.
// The auto generated comp's dimensions and duration are all just defaults specified below. This shouldn't matter as you can
// change the comp's properties at any time.

{

    var activeItem = app.project.activeItem;
    if (activeItem == null || !(activeItem instanceof CompItem))
    {
        alert("Please select the template composition to use in the Project panel.");
    }
    else
    {
        clearOutput();
        write( "Initialising..." );
        init();
    }
}

function init()
{
    // create undo group

    app.beginUndoGroup("Create Text Layers From File");

    // Prompt user to select text file

    var myFile = File.openDialog("Please select input text file.");
    if (myFile != null)
    {

        // open file
        var fileOK = myFile.open("r");
        if ( fileOK )
        {

            // create project if necessary

            var proj = app.project;
            if(!proj) proj = app.newProject();

            // create new comp named 'my text comp'

            var compW = 1024; // comp width
            var compH = 576; // comp height
            var compL = 99;  // comp length (seconds)
            var compRate = 30; // comp frame rate
            var compBG = [48/255,63/255,84/255] // comp background color
            var myItemCollection = app.project.items;


            var mainAutoGeneratedComp = fetchCompByName( "_auto_generated_text_comp" );

            if ( !mainAutoGeneratedComp )
            {
              mainAutoGeneratedComp = myItemCollection.addComp("_auto_generated_text_comp",compW,compH,1,compL,compRate);
              mainAutoGeneratedComp.bgColor = compBG;
            }
        
            var autoGeneratedCompFolder = fetchCompByName( "_auto_generated_comps" );
            if ( !autoGeneratedCompFolder ) 
            {
                autoGeneratedCompFolder = myItemCollection.addFolder( "_auto_generated_comps" );
            }
            

            // Read first line for field values;
            var text = myFile.readln();
            var _text_field_names = text.split(",");
            var _text_values = text.split(",");
            var _new_comp_name = "_agc_" + activeItem.name + "_";
            var counter = 0;
            
            // read text lines and create duplicate of selected comp
            // until end-of-file is reached
            while (!myFile.eof)
            {
                text = myFile.readln();
                if (text == "") { text = "\r" ;}
                _text_values = parseCSV( text );

                if ( text != ",," && text != ",,\r" )
                {
                    counter ++;
                    
                    var newComp = fetchCompByName( _new_comp_name + counter );
                    
                    // If the auto generated comp for this line in the text file already exists,
                    // mark it for deletion and replace it with a new instance. This ensures that
                    // anywhere the auto generated comp is in use will be replaced with our new
                    // updated version.
                    if ( !newComp )
                    {
                        newComp = activeItem.duplicate();
                        newComp.name = _new_comp_name + counter;
                        newComp.parentFolder = autoGeneratedCompFolder;
                    }
                    else
                    {
                        var replacement = activeItem.duplicate();
                        replacement.name = _new_comp_name + counter;
                        replacement.parentFolder = autoGeneratedCompFolder;
                        newComp.name = "to_delete";
                        
                        replaceAllReferencesTo( newComp, replacement );
                        newComp.remove();
                        newComp = replacement;
                    }
                    
                    if ( !mainAutoGeneratedComp.layers.byName( newComp.name ) )
                    {
                        mainAutoGeneratedComp.layers.add( newComp );
                    }
                
                    for ( var m = 0; m < _text_field_names.length; m++ )
                    {
                        if ( _text_values[ m ] )
                        {
                            switch ( _text_field_names[ m ] )
                            {
                                  case "in" :      //write("Setting in point to " + parseFloat( _text_values[ m ] )); 
                                                        if ( !isNaN( parseFloat( _text_values[ m ] ) ) )
                                                        {
                                                            mainAutoGeneratedComp.layers[ 1 ].inPoint = parseFloat( _text_values[ m ] );
                                                        }
                                                        break;
                                                        
                                case "out" :      
                                                        if ( !isNaN( parseFloat( _text_values[ m ] ) ) )
                                                        {
                                                            mainAutoGeneratedComp.layers[ 1 ].outPoint = parseFloat( _text_values[ m ] );
                                                        }
                                                        break;
                                                        
                                    default :      findReplaceLayerValue( newComp, _text_field_names[ m ], _text_values[ m ] );
                                                        break;
                            }
                        }
                    }
                }
            }

              // close the file before exiting
              myFile.close();
        }
        else
        {
            alert("File open failed!");
        }
    }
    else
    {
        alert("No text file selected.");
    }

    app.endUndoGroup();
    clearOutput();
    write( "Operation complete." );
}

function findReplaceLayerValue( $theComp, $fieldName, $replaceValue )
{
//    writeLn( "FindReplaceLayerValue called with: " + $fieldName + " -> " + String( $replaceValue ) );
    var destWidth = -1;
    var destHeight = -1;
    var destX = 0;
    var destY = 0;

    for ( var f = 1; f <= $theComp.layers.length; f++ )
    {
 //       write( "Does " + theComp.layers[ f ].name +" == " + $fieldName +" ?" );
        if ( $theComp.layers[ f ].name == $fieldName )
        {
//            write( "Yes, is" + theComp.layers[ f ].name +" instanceof TextLayer ? " + ( theComp.layers[ f ] instanceof TextLayer ) );
            if ( $theComp.layers[ f ] instanceof TextLayer )
            {
                $theComp.layers[ f ].text.property("sourceText").setValue( "A test for heighty." );
                destHeight = $theComp.layers[ f ].sourceRectAtTime( 0, false ).height + 20;
                destY = ( $theComp.layers[ f ].height - destHeight ) / 2;
                
                $theComp.layers[ f ].text.property("sourceText").setValue( $replaceValue );
                destWidth = $theComp.layers[ f ].sourceRectAtTime( 0, false ).width + 30;
                destX = $theComp.layers[ f ].transform.position.value[ 0 ];
            
//                $theComp.layers[ f ].transform.property( "Position" ).setValue( [ destX, destY ] );
            }
        
            break;
        }
    }

    if ( destWidth > 0 && destHeight > 0 )
    {
        var background = $theComp.layers.byName( "background" );
        
        if ( background )
        {
            destWidth = destWidth / background.width * 100;
            destHeight = destHeight / background.height * 100;
//            writeLn( "Setting background width to " + destWidth + "x" + destHeight );
            background.transform.property( "scale" ).setValue( [ destWidth, destHeight ] );
        }
    }

}

function replaceAllReferencesTo( $compToReplace, $replacement )
{
    var myItemCollection = app.project.items;
    
    for ( var i = 1; i <= myItemCollection.length; i++ )
    {
        if ( myItemCollection[ i ] instanceof CompItem )
        {
            for ( var j = 1; j <= myItemCollection[ i ].layers.length; j++ )
            {
                if ( myItemCollection[ i ].layers[ j ].source == $compToReplace )
                {
//                    writeLn("REPLACING LAYER!!" );
                    myItemCollection[ i ].layers[ j ].replaceSource( $replacement, true );
                }
            }
        }
    }
}

function fetchCompByName( $name )
{
    var myItemCollection = app.project.items;
    
    for ( var i = 1; i <= myItemCollection.length; i++ )
    {
        if ( myItemCollection[ i ].name == $name )
        {
            return myItemCollection[ i ];
        }
    }

    return null;
}

function parseCSV( $csvStr )
{
    var results = $csvStr.split(",");
    for ( var uic = 0; uic < results.length; uic++ )
    {
        if ( results[ uic ][ results[ uic ].length - 1 ] == '"' && results[ uic ][ 0 ] != '"' )
        {
            var j = uic - 1;
            while ( j >= 0 && results[ j ][ 0 ] != '"' )
            {
                results[ j ] = results[ j ] + "," + results[ j + 1 ];
                results.splice( j + 1, 1 );
                j --;
            }
            results[ j ] = String( results[ j ] + "," + results[ j + 1 ] );
            if ( results[ j ][ 0 ] == '"' ) results[ j ] = results[ j ].slice( 1, results[ j ].length - 1 );
            if ( results[ j ][ results[ j ].length - 1 ] == '"' ) results[ j ] = results[ j ].slice( 0, results[ j ].length - 2 );
            results.splice( j + 1, 1 );
        }
    }

    results[ 0 ] == String( results[ 0 ] );
//    writeLn( "Returning: " + results.length );
//    writeLn( "    :" + String( results[ 0 ] ) + ";");    
    return results;
}


